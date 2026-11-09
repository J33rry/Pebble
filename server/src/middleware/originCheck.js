import { env } from "../config/env.js";
import { AppError } from "../lib/AppError.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Browsers always attach Origin to cross-site writes and WebSocket handshakes,
// so a missing header means a non-browser client, which holds no victim cookie.
export function isAllowedOrigin(origin) {
    return !origin || origin === env.CORS_ORIGIN;
}

// The session cookie is SameSite=None in production (web and API are on
// different sites), so it is sent on cross-site requests. CORS only stops the
// attacker reading the response, not the write itself; this stops the write.
export function requireTrustedOrigin(req, _res, next) {
    if (SAFE_METHODS.has(req.method) || isAllowedOrigin(req.headers.origin)) {
        return next();
    }
    throw new AppError(403, "Origin not allowed", "BAD_ORIGIN");
}
