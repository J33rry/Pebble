import { AppError } from "../../lib/AppError.js";
import * as repo from "./messages.repository.js";
import { findMediaById } from "../media/media.repository.js";
import {
    findChatParticipants,
    advanceLastReadAt,
} from "../chats/chats.repository.js";
import { broadcastToUser } from "../../ws/connectionRegistry.js";

// Outbound-only, in addition to the normal message:new fan-out, so a client
// can surface a mention distinctly. No EVENT_ROUTES entry needed.
function notifyMentions(userIds, payload) {
    for (const userId of userIds) {
        broadcastToUser(userId, { type: "mention:new", payload });
    }
}

export async function getMessages(chatId, pagination) {
    return repo.findMessages(chatId, pagination);
}

// Usernames are varchar(30) and alphanumeric/underscore (see auth.validation).
// The lookbehind stops "foo@bar" and "@@x" from matching.
const MENTION_RE = /(?<![\w@])@([a-zA-Z0-9_]{3,30})/g;

/**
 * Resolve @usernames against this chat's participants only — never a global
 * username lookup, which would leak membership and let anyone be mentioned.
 */
async function syncMentions(messageId, chatId, content) {
    const names = new Set(
        [...(content || "").matchAll(MENTION_RE)].map((m) => m[1].toLowerCase()),
    );

    let userIds = [];
    if (names.size > 0) {
        const participants = await findChatParticipants(chatId);
        userIds = participants
            .filter((p) => names.has((p.username || "").toLowerCase()))
            .map((p) => p.userId);
    }

    await repo.replaceMentions(messageId, userIds);
    return userIds;
}

// The route only proves the user belongs to :chatId, so every operation on a
// message must also confirm the message is in that chat.
async function getMessageInChat(chatId, messageId) {
    const message = await repo.findMessageById(messageId);
    if (!message || message.chatId !== chatId) {
        throw new AppError(404, "Message not found", "NOT_FOUND");
    }
    return message;
}

export async function sendMessage(chatId, senderId, data) {
    if (data.mediaId) {
        // Attaching media grants the chat access to it, so only the uploader
        // may attach it.
        const attachment = await findMediaById(data.mediaId);
        if (!attachment || attachment.uploaderId !== senderId) {
            throw new AppError(403, "You cannot attach this media", "FORBIDDEN");
        }
    }

    if (data.replyToMessageId) {
        await getMessageInChat(chatId, data.replyToMessageId);
    }

    const { message, created } = await repo.createMessage({
        chatId,
        senderId,
        type: data.type,
        content: data.content,
        mediaId: data.mediaId || null,
        replyToMessageId: data.replyToMessageId || null,
        clientMessageId: data.clientMessageId || null,
    });

    // A retry of a message that already went out: nobody needs telling twice.
    if (!created) return { message, created };

    const mentionedUserIds = await syncMentions(message.id, chatId, data.content);
    // Never notify yourself for mentioning yourself.
    notifyMentions(
        mentionedUserIds.filter((id) => id !== senderId),
        { chatId, messageId: message.id, senderId },
    );

    return { message, created };
}

export async function editMessage(chatId, messageId, userId, content) {
    const message = await getMessageInChat(chatId, messageId);
    if (message.senderId !== userId) {
        throw new AppError(403, "Can only edit your own messages", "FORBIDDEN");
    }
    if (message.isDeleted) {
        throw new AppError(400, "Cannot edit a deleted message", "MESSAGE_DELETED");
    }

    const updated = await repo.updateMessage(messageId, { content, isEdited: true });
    // Re-sync so removing a mention in an edit actually removes it.
    await syncMentions(messageId, message.chatId, content);
    return updated;
}

export async function deleteMessage(chatId, messageId, userId) {
    const message = await getMessageInChat(chatId, messageId);
    if (message.senderId !== userId) {
        throw new AppError(403, "Can only delete your own messages", "FORBIDDEN");
    }

    // Soft delete nulls the content, so drop the mention rows with it —
    // otherwise a deleted message keeps contributing to mention badges.
    await repo.replaceMentions(messageId, []);
    return repo.softDeleteMessage(messageId);
}

export async function addReaction(chatId, messageId, userId, reaction) {
    await getMessageInChat(chatId, messageId);
    return repo.upsertReaction(messageId, userId, reaction);
}

export async function removeReaction(chatId, messageId, userId, reaction) {
    await getMessageInChat(chatId, messageId);
    await repo.removeReaction(messageId, userId, reaction);
}

export async function markRead(chatId, messageIds, userId) {
    await repo.markRead(chatId, messageIds, userId);
    // Advance the unread watermark in the same pass, so the sidebar badge
    // clears without the client needing a second call.
    await advanceLastReadAt(chatId, userId);
}
