import { z } from "zod";
import { broadcastToChat } from "../connectionRegistry.js";
import { findParticipant } from "../../modules/chats/chatParticipants.repository.js";

const typingSchema = z.object({ chatId: z.string().uuid() });

export async function handleTypingEvent(socket, type, payload) {
    const userId = socket.data.userId;
    const parsed = typingSchema.safeParse(payload);
    if (!parsed.success) return;

    const { chatId } = parsed.data;
    if (!(await findParticipant(chatId, userId))) return;

    // typing:start and typing:stop are ephemeral — no persistence,
    // just fan out to other chat participants
    broadcastToChat(chatId, { type, payload: { chatId, userId } }, userId);
}
