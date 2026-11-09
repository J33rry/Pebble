import { getChatParticipantUserIds } from "../modules/chats/chats.repository.js";

// Delivery runs through Socket.IO rooms: every socket joins `user:<userId>`,
// so a user with several devices is addressed by one room name.
//
// The userSockets index below exists only to answer presence questions
// (isOnline) synchronously, which the adapter cannot do.
//
// For horizontal scaling (multiple server instances), swap the default
// in-memory adapter for @socket.io/redis-adapter: room emits then fan out
// across instances with no change to the functions below. Presence would
// move to a shared Redis set at that point.

let io = null;
const userSockets = new Map();

export const userRoom = (userId) => `user:${userId}`;

export function setIoServer(ioServer) {
    io = ioServer;
}

export function addConnection(userId, socket) {
    socket.join(userRoom(userId));
    if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);
}

export function removeConnection(userId, socket) {
    const socketIds = userSockets.get(userId);
    if (!socketIds) return;
    socketIds.delete(socket.id);
    if (socketIds.size === 0) userSockets.delete(userId);
}

export function getConnections(userId) {
    return userSockets.get(userId) || new Set();
}

export function isOnline(userId) {
    return getConnections(userId).size > 0;
}

export function broadcastToUser(userId, event) {
    if (!io) return;
    io.to(userRoom(userId)).emit(event.type, event.payload);
}

// Fan-out to all participants of a chat except the sender.
// Fetches participant list from DB so it's always current.
//
// Delivery is best-effort: most callers fire this without awaiting, so a
// rejection here would surface as an unhandled rejection and take the
// process down. Failures are logged and swallowed instead.
export async function broadcastToChat(chatId, event, excludeUserId) {
    if (!io) return;
    try {
        const participantIds = await getChatParticipantUserIds(chatId);
        const rooms = participantIds
            .filter((userId) => userId !== excludeUserId)
            .map(userRoom);

        if (rooms.length === 0) return;
        // Socket.IO de-duplicates recipients across the listed rooms.
        io.to(rooms).emit(event.type, event.payload);
    } catch (err) {
        console.error(`[WS] Failed to fan out ${event.type} to chat ${chatId}:`, err);
    }
}

// Force-close a user's live sockets after their sessions are revoked. A session
// check only runs at handshake, so an open socket would otherwise keep working.
export async function disconnectUserSockets(userId, { exceptSessionId } = {}) {
    if (!io) return;
    try {
        const sockets = await io.in(userRoom(userId)).fetchSockets();
        for (const socket of sockets) {
            if (socket.request.session?.id !== exceptSessionId) {
                socket.disconnect(true);
            }
        }
    } catch (err) {
        console.error(`[WS] Failed to disconnect user ${userId}:`, err);
    }
}
