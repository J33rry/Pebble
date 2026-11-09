import { Server } from "socket.io";
import { env } from "../config/env.js";
import { isAllowedOrigin } from "../middleware/originCheck.js";
import {
    setIoServer,
    addConnection,
    removeConnection,
    isOnline,
} from "./connectionRegistry.js";
import { handleTypingEvent } from "./handlers/typingHandlers.js";
import { handleCallEvent } from "./handlers/callHandlers.js";
import {
    getPresencePeers,
    handlePresenceEvent,
} from "./handlers/presenceHandlers.js";
import { updateLastSeen } from "../modules/users/users.repository.js";
import { findUserById } from "../modules/auth/auth.repository.js";

export const SOCKET_PATH = "/ws";

const SOCKET_EVENT_WINDOW_MS = 10_000;
const SOCKET_EVENT_MAX = 50;

// Inbound events the client is allowed to emit, grouped by the handler that
// owns them. Socket.IO has no notion of an "unknown event", so this allowlist
// is what keeps the surface explicit. Everything else (messages, reactions,
// read receipts, call lifecycle) goes through REST, which runs the auth and
// participant middleware; the socket only delivers the resulting events.
const EVENT_ROUTES = [
    [handleTypingEvent, ["typing:start", "typing:stop"]],
    [handleCallEvent, ["call:rejected"]],
];

export function setupWebSocketGateway(httpServer, sessionMiddleware) {
    const io = new Server(httpServer, {
        path: SOCKET_PATH,
        cors: { origin: env.CORS_ORIGIN, credentials: true },
        // Only small JSON events are accepted inbound.
        maxHttpBufferSize: 16_384,
        // The `cors` option above does not apply to WebSocket upgrades, so
        // without this any site could open a socket using the visitor's cookie.
        allowRequest: (req, callback) => {
            const allowed = isAllowedOrigin(req.headers.origin);
            callback(allowed ? null : "Origin not allowed", allowed);
        },
    });

    setIoServer(io);

    // Run the express session middleware on every engine request so the
    // session cookie is parsed from the headers and verified against the
    // Redis store, exposing it as socket.request.session.
    io.engine.use(sessionMiddleware);

    io.use(async (socket, next) => {
        const session = socket.request.session;
        if (!session?.userId) {
            next(new Error("Unauthorized"));
            return;
        }

        try {
            const user = await findUserById(session.userId);
            if (
                !user ||
                user.deletedAt ||
                (session.sessionVersion ?? 0) !== user.sessionVersion
            ) {
                next(new Error("Unauthorized"));
                return;
            }
            next();
        } catch (err) {
            console.error("[WS] Handshake failed:", err);
            next(new Error("Unauthorized"));
        }
    });

    io.on("connection", (socket) => {
        const userId = socket.request.session.userId;
        socket.data.userId = userId;

        const wasAlreadyOnline = isOnline(userId);
        addConnection(userId, socket);

        // Initial presence: only the people this user is connected to.
        getPresencePeers(userId)
            .then((peers) => {
                socket.emit("presence:sync", {
                    onlineUserIds: [userId, ...[...peers].filter(isOnline)],
                });
            })
            .catch((err) => {
                console.error("[WS] Failed to sync presence:", err);
            });

        // Notify contacts & chat peers of online status if user just came online
        if (!wasAlreadyOnline) {
            handlePresenceEvent(userId, "online");
        }

        // Handlers hit the database, so cap how fast one socket can drive them.
        // Kept per socket: the counter dies with the connection.
        let windowStart = Date.now();
        let eventCount = 0;

        for (const [handler, events] of EVENT_ROUTES) {
            for (const event of events) {
                socket.on(event, async (payload) => {
                    const now = Date.now();
                    if (now - windowStart > SOCKET_EVENT_WINDOW_MS) {
                        windowStart = now;
                        eventCount = 0;
                    }
                    if (++eventCount > SOCKET_EVENT_MAX) return;

                    try {
                        await handler(socket, event, payload ?? {});
                    } catch (err) {
                        console.error(`[WS] Error handling ${event}:`, err);
                        socket.emit("error", {
                            message: `Failed to process ${event}`,
                        });
                    }
                });
            }
        }

        socket.on("disconnect", async () => {
            removeConnection(userId, socket);
            if (!isOnline(userId)) {
                try {
                    const lastSeenAt = await updateLastSeen(userId);
                    handlePresenceEvent(userId, "offline", lastSeenAt);
                } catch (e) {
                    handlePresenceEvent(userId, "offline");
                }
            }
        });
    });

    return io;
}
