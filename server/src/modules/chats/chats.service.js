import { AppError } from "../../lib/AppError.js";
import * as repo from "./chats.repository.js";
import { broadcastToChat, broadcastToUser } from "../../ws/connectionRegistry.js";
import { findLatestMessagesForChats } from "../messages/messages.repository.js";
import { findFolderIdsForChats } from "../folders/folders.repository.js";
import { removeUserFromActiveCalls } from "../calls/calls.service.js";

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
            repo.findChatParticipantsForChats(chatIds),
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

const URL_RE = /https?:\/\/[^\s<>"')]+/gi;

export async function listChatMedia(chatId, { kind, before, limit }) {
    if (kind === "link") {
        const rows = await repo.findChatLinks(chatId, { before, limit });
        // One message can carry several links; flatten them into entries.
        const items = [];
        for (const row of rows) {
            const urls = row.content?.match(URL_RE) || [];
            for (const [i, url] of urls.entries()) {
                let host = null;
                try {
                    host = new URL(url).host;
                } catch {
                    // Keep the raw URL even if it doesn't parse.
                }
                items.push({
                    id: `${row.messageId}:${i}`,
                    messageId: row.messageId,
                    url,
                    host,
                    createdAt: row.createdAt,
                    sender: {
                        id: row.senderId,
                        username: row.senderUsername,
                        displayName: row.senderDisplayName,
                    },
                });
            }
        }
        return items;
    }

    const rows = await repo.findChatMedia(chatId, { kind, before, limit });
    return rows.map((r) => ({
        id: r.mediaId,
        messageId: r.messageId,
        type: r.type,
        url: r.url,
        fileName: r.fileName,
        mimeType: r.mimeType,
        // bigint is not JSON-serialisable.
        fileSize: r.fileSize == null ? null : Number(r.fileSize),
        createdAt: r.createdAt,
        sender: {
            id: r.senderId,
            username: r.senderUsername,
            displayName: r.senderDisplayName,
        },
    }));
}

export async function getChatMediaCounts(chatId) {
    return repo.countChatMediaByKind(chatId);
}

export async function updateMyChatPreferences(chatId, userId, { pinned, archived, muted }) {
    const now = new Date();
    const patch = {};
    if (pinned !== undefined) patch.pinnedAt = pinned ? now : null;
    if (archived !== undefined) patch.archivedAt = archived ? now : null;
    if (muted !== undefined) patch.isMuted = muted;

    const row = await repo.updateParticipantPreferences(chatId, userId, patch);
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

    const rawParticipants = await repo.findChatParticipants(chatId);

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

    const requester = await repo.findParticipant(chatId, userId);
    if (!requester || requester.role !== "admin") {
        throw new AppError(403, "Admin privileges required", "NOT_ADMIN");
    }

    const participantIds = await repo.getChatParticipantUserIds(chatId);
    await repo.deleteChat(chatId);

    for (const pId of participantIds) {
        broadcastToUser(pId, { type: "chat:deleted", payload: { chatId } });
    }
}

export async function addParticipants(chatId, userIds) {
    const chat = await repo.findChatById(chatId);
    if (chat.type === "dm") {
        throw new AppError(400, "Cannot add participants to a DM", "DM_NO_ADD");
    }

    const added = await repo.addMissingParticipants(chatId, [...new Set(userIds)]);
    for (const participant of added) {
        broadcastToUser(participant.userId, { type: "chat:new", payload: { chatId } });
    }

    if (added.length > 0) {
        broadcastToChat(chatId, { type: "chat:updated", payload: { chatId } });
    }
    return added;
}

export async function updateParticipantRole(chatId, userId, role) {
    const updated = await repo.updateParticipantRole(chatId, userId, role);
    if (!updated) {
        throw new AppError(404, "Participant not found", "NOT_FOUND");
    }
    broadcastToChat(chatId, { type: "chat:updated", payload: { chatId } });
    return updated;
}

export async function removeParticipant(chatId, userId, requestingUserId) {
    const chat = await repo.findChatById(chatId);

    // Self-removal (leaving) is always allowed
    if (userId !== requestingUserId) {
        // Removing someone else requires admin
        const requester = await repo.findParticipant(chatId, requestingUserId);
        if (!requester || requester.role !== "admin") {
            throw new AppError(403, "Admin privileges required", "NOT_ADMIN");
        }
    }

    const { removed, chatDeleted } = await repo.removeMember(chatId, userId, {
        isGroup: chat.type === "group",
    });
    if (!removed) {
        throw new AppError(404, "Participant not found", "NOT_FOUND");
    }

    await removeUserFromActiveCalls(chatId, userId);

    broadcastToUser(userId, { type: "chat:deleted", payload: { chatId } });
    if (!chatDeleted) {
        broadcastToChat(chatId, { type: "chat:updated", payload: { chatId } });
    }
}

export async function getChatParticipantUserIds(chatId) {
    return repo.getChatParticipantUserIds(chatId);
}
