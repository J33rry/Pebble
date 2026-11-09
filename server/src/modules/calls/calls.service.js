import crypto from "node:crypto";
import { AppError } from "../../lib/AppError.js";
import { createLiveKitToken, roomService } from "../../lib/livekit.js";
import { env } from "../../config/env.js";
import * as repo from "./calls.repository.js";
import { findChatById, findParticipant } from "../chats/chats.repository.js";

export async function initiateCall(chatId, initiatorId, initiatorName, type) {
    const roomName = `call-${crypto.randomUUID()}`;

    const call = await repo.createCall({
        chatId,
        initiatorId,
        roomName,
        type,
    });

    await repo.addCallParticipant(call.id, initiatorId);

    // Generate a LiveKit token so the initiator can immediately join the room
    const token = await createLiveKitToken(roomName, initiatorId, initiatorName);

    return { call, token, livekitUrl: env.LIVEKIT_URL };
}

export async function joinCall(callId, userId, displayName) {
    const call = await repo.findCallById(callId);
    if (!call) throw new AppError(404, "Call not found", "NOT_FOUND");
    if (call.endedAt) throw new AppError(400, "Call has ended", "CALL_ENDED");

    const participant = await repo.addCallParticipant(callId, userId);

    // Generate a LiveKit token for the joining participant
    const token = await createLiveKitToken(call.roomName, userId, displayName);

    return { participant, token, livekitUrl: env.LIVEKIT_URL, chatId: call.chatId };
}

export async function leaveCall(callId, userId) {
    const call = await repo.findCallById(callId);
    if (!call) throw new AppError(404, "Call not found", "NOT_FOUND");

    const participant = await repo.leaveCall(callId, userId);

    // Auto-end call if no active participants remain
    const activeCount = await repo.findActiveParticipantCount(callId);
    const ended = activeCount === 0 && !call.endedAt;
    if (ended) {
        await repo.endCall(callId);
        // Clean up the LiveKit room
        try {
            await roomService.deleteRoom(call.roomName);
        } catch {
            // Room may already be gone — that's fine
        }
    }

    return { participant, ended, chatId: call.chatId };
}

export async function endCall(callId, userId) {
    const call = await repo.findCallById(callId);
    if (!call) throw new AppError(404, "Call not found", "NOT_FOUND");
    if (call.endedAt) throw new AppError(400, "Call already ended", "CALL_ENDED");

    // In a DM, hanging up ends it for both. In a group only the person who
    // started the call or an admin can end it for everyone; others just leave.
    const chat = await findChatById(call.chatId);
    if (chat.type !== "dm" && call.initiatorId !== userId) {
        const participant = await findParticipant(call.chatId, userId);
        if (participant?.role !== "admin") {
            throw new AppError(403, "Only the host or an admin can end this call", "CALL_END_FORBIDDEN");
        }
    }

    const ended = await repo.endCall(callId);

    // Force-close the LiveKit room, disconnecting all participants
    try {
        await roomService.deleteRoom(call.roomName);
    } catch {
        // Room may already be gone — that's fine
    }

    return ended;
}

// A removed member must lose call access now, not when their connection ends.
// Runs after the removal has committed, so a LiveKit failure can't undo it.
export async function removeUserFromActiveCalls(chatId, userId) {
    try {
        for (const call of await repo.findActiveCallsForChat(chatId)) {
            try {
                await roomService.removeParticipant(call.roomName, userId);
            } catch {
                // Not connected to this room
            }
            await repo.leaveCall(call.id, userId);
        }
    } catch (err) {
        console.error(`[CALLS] Failed to remove ${userId} from calls:`, err);
    }
}

export async function getCallParticipants(callId) {
    return repo.findCallParticipants(callId);
}

export async function getChatCallHistory(chatId) {
    return repo.findChatCallHistory(chatId);
}

export async function getUserCallHistory(userId) {
    return repo.findUserCallHistory(userId);
}

export async function generateToken(callId, userId, displayName) {
    const call = await repo.findCallById(callId);
    if (!call) throw new AppError(404, "Call not found", "NOT_FOUND");
    if (call.endedAt) throw new AppError(400, "Call has ended", "CALL_ENDED");

    const token = await createLiveKitToken(call.roomName, userId, displayName);
    return { token, livekitUrl: env.LIVEKIT_URL };
}
