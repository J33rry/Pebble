import { z } from "zod";
import { broadcastToUser } from "../connectionRegistry.js";
import { findCallById } from "../../modules/calls/calls.repository.js";
import { findChatById } from "../../modules/chats/chats.repository.js";
import { findParticipant } from "../../modules/chats/chatParticipants.repository.js";

const callEventSchema = z.object({ callId: z.string().uuid() });

// The only call event a client emits: declining an incoming call. Starting,
// joining, leaving and ending all go through the REST routes.
export async function handleCallEvent(socket, type, payload) {
    const userId = socket.data.userId;
    const parsed = callEventSchema.safeParse(payload);
    if (type !== "call:rejected" || !parsed.success) return;

    const call = await findCallById(parsed.data.callId);
    if (!call || call.endedAt) return;
    if (!(await findParticipant(call.chatId, userId))) return;

    // The caller's client ends the call when told it was rejected. That's right
    // for a DM, but in a group one person declining says nothing about the rest.
    const chat = await findChatById(call.chatId);
    if (chat.type !== "dm") return;

    broadcastToUser(call.initiatorId, {
        type: "call:rejected",
        payload: { callId: call.id, userId },
    });
}
