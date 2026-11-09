import { broadcastToUser } from "../connectionRegistry.js";
import { findUserContacts } from "../../modules/contacts/contacts.repository.js";
import {
    findUserChats,
    findChatParticipantsForChats,
} from "../../modules/chats/chats.repository.js";

// Everyone allowed to see this user's presence: accepted contacts and the
// other participants of their chats.
export async function getPresencePeers(userId) {
    const [contacts, userChats] = await Promise.all([
        findUserContacts(userId),
        findUserChats(userId),
    ]);

    const peers = new Set();
    for (const contact of contacts) {
        if (contact.status === "accepted") {
            peers.add(contact.userId === userId ? contact.contactId : contact.userId);
        }
    }

    const participants = await findChatParticipantsForChats(
        userChats.map(({ chat }) => chat.id),
    );
    for (const { userId: participantId } of participants) {
        peers.add(participantId);
    }

    peers.delete(userId);
    return peers;
}

// Notify a user's accepted contacts and chat peers about their presence change.
// Callers don't await this, so it must never reject.
export async function handlePresenceEvent(userId, status, lastSeenAt = null) {
    try {
        const peers = await getPresencePeers(userId);
        const event = {
            type: `presence:${status}`,
            payload: { userId, lastSeenAt },
        };
        for (const peerId of peers) {
            broadcastToUser(peerId, event);
        }
    } catch (err) {
        console.error("[WS] Failed to broadcast presence:", err);
    }
}
