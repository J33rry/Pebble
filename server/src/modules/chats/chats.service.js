import { AppError } from "../../lib/AppError.js";
import * as repo from "./chats.repository.js";
import * as participantsRepo from "./chatParticipants.repository.js";
import { broadcastToChat, broadcastToUser } from "../../ws/connectionRegistry.js";
import { findLatestMessagesForChats } from "../messages/messages.repository.js";
import { findFolderIdsForChats } from "../folders/folders.repository.js";

function mapParticipants(rawParticipants) {
    return rawParticipants.map(p => ({
        id: p.id,
        userId: p.userId,
        chatId: p.chatId,
        role: p.role,
        joinedAt: p.joinedAt,
        user: {
            id: p.userId,
            username: p.username,
            displayName: p.displayName,
            avatarUrl: p.avatarUrl,
            lastSeenAt: p.lastSeenAt,
        }
    }));
}

export async function listChats(userId, { archived = false } = {}) {
    // Always an explicit boolean here: the repository treats `undefined` as
    // "every chat", which is what the presence fan-out wants, not the list.
    const userChats = await repo.findUserChats(userId, { archived: !!archived });
    if (userChats.length === 0) return [];

    const chatIds = userChats.map(({ chat }) => chat.id);

    // A handful of flat queries for the whole list, rather than ~4 per chat.
    const [participantRows, latestByChat, unreadByChat, folderIdsByChat] =
        await Promise.all([
            participantsRepo.findChatParticipantsForChats(chatIds),
            findLatestMessagesForChats(chatIds),
            repo.findUnreadCountsForUser(userId),
            findFolderIdsForChats(userId, chatIds),
        ]);

    const participantsByChat = new Map();
    for (const p of participantRows) {
        if (!participantsByChat.has(p.chatId)) participantsByChat.set(p.chatId, []);
        participantsByChat.get(p.chatId).push(p);
    }

    return userChats.map(({ chat, role, lastReadAt, pinnedAt, archivedAt, isMuted }) => {
        const rawParticipants = participantsByChat.get(chat.id) || [];

        return {
            ...chat,
            myRole: role,
            participants: mapParticipants(rawParticipants),
            latestMessage: latestByChat.get(chat.id) || null,
            unreadCount: unreadByChat.get(chat.id)?.unread || 0,
            mentionCount: unreadByChat.get(chat.id)?.mentions || 0,
            folderIds: folderIdsByChat.get(chat.id) || [],
            lastReadAt,
            pinnedAt,
            archivedAt,
            isMuted,
        };
    });
}

export async function updateMyChatPreferences(chatId, userId, { pinned, archived, muted }) {
    const now = new Date();
    const patch = {};
    if (pinned !== undefined) patch.pinnedAt = pinned ? now : null;
    if (archived !== undefined) patch.archivedAt = archived ? now : null;
    if (muted !== undefined) patch.isMuted = muted;

    const row = await participantsRepo.updateParticipantPreferences(chatId, userId, patch);
    if (!row) throw new AppError(404, "Chat participant not found", "NOT_FOUND");

    broadcastToUser(userId, {
        type: "chat:preferences",
        payload: {
            chatId,
            pinnedAt: row.pinnedAt,
            archivedAt: row.archivedAt,
            isMuted: row.isMuted,
        },
    });

    return row;
}

export async function createChat(userId, { type, name, description, participantIds }) {
    if (type === "dm") {
        if (participantIds.length !== 1) {
            throw new AppError(400, "DM requires exactly one other participant", "INVALID_DM");
        }

        const otherUserId = participantIds[0];
        if (otherUserId === userId) {
            throw new AppError(400, "Cannot start a DM with yourself", "INVALID_DM");
        }

        const { chat, created } = await repo.findOrCreateDm(userId, otherUserId);
        if (created) {
            broadcastToUser(otherUserId, { type: "chat:new", payload: { chatId: chat.id } });
        }
        return chat;
    }

    // Group chat
    const memberIds = [...new Set(participantIds)].filter((id) => id !== userId);
    if (memberIds.length === 0) {
        throw new AppError(400, "A group needs at least one other member", "INVALID_GROUP");
    }

    const chat = await repo.createGroupChat({ name, description, createdBy: userId }, memberIds);
    for (const memberId of memberIds) {
        broadcastToUser(memberId, { type: "chat:new", payload: { chatId: chat.id } });
    }
    return chat;
}

export async function getChat(chatId) {
    const chat = await repo.findChatById(chatId);
    if (!chat) throw new AppError(404, "Chat not found", "NOT_FOUND");

    const rawParticipants = await participantsRepo.findChatParticipants(chatId);

    return { ...chat, participants: mapParticipants(rawParticipants) };
}

export async function updateChat(chatId, data) {
    const chat = await repo.updateChat(chatId, data);
    broadcastToChat(chatId, { type: "chat:updated", payload: { chatId } });
    return chat;
}

export async function deleteChat(chatId, userId) {
    const chat = await repo.findChatById(chatId);
    if (!chat) throw new AppError(404, "Chat not found", "NOT_FOUND");
    if (chat.type === "dm") throw new AppError(400, "Cannot delete a DM", "INVALID_ACTION");

    const requester = await participantsRepo.findParticipant(chatId, userId);
    if (!requester || requester.role !== "admin") {
        throw new AppError(403, "Admin privileges required", "NOT_ADMIN");
    }

    const participantIds = await participantsRepo.getChatParticipantUserIds(chatId);
    await repo.deleteChat(chatId);

    for (const pId of participantIds) {
        broadcastToUser(pId, { type: "chat:deleted", payload: { chatId } });
    }
}
