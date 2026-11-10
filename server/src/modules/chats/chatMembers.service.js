import { AppError } from "../../lib/AppError.js";
import { broadcastToChat, broadcastToUser } from "../../ws/connectionRegistry.js";
import { removeUserFromActiveCalls } from "../calls/calls.service.js";
import { findChatById } from "./chats.repository.js";
import * as repo from "./chatParticipants.repository.js";

export async function addParticipants(chatId, userIds) {
    const chat = await findChatById(chatId);
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
    const chat = await findChatById(chatId);

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
