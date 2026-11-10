import session from "express-session";
import { RedisStore } from "connect-redis";

import { env } from "../config/env.js";
import { redisClient } from "./redis.js";

const isProduction = env.NODE_ENV === "production";

// Shared by Express and the Socket.IO handshake.
export const sessionMiddleware = session({
    store: new RedisStore({ client: redisClient }),
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isProduction,
        httpOnly: true,
        // The web app and API are on different sites in production.
        sameSite: isProduction ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    },
});
