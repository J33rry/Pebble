import { AppError } from "../lib/AppError.js";
import { redisClient } from "../lib/redis.js";

// Atomic so the expiry can never be lost between the increment and setting it,
// which would leave a key counting forever.
const INCREMENT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
    redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return {count, redis.call('PTTL', KEYS[1])}
`;

export const byUser = (req) => req.user.id;

// Per-address limits catch attacks spread across many IPs.
export const byEmail = (req) =>
    typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase().slice(0, 255)
        : req.ip;

export function rateLimiter({ name, windowMs = 60_000, max = 10, keyFn }) {
    return async (req, res, next) => {
        const key = `ratelimit:${name}:${keyFn ? keyFn(req) : req.ip}`;

        let count, ttlMs;
        try {
            [count, ttlMs] = await redisClient.eval(INCREMENT_SCRIPT, {
                keys: [key],
                arguments: [String(windowMs)],
            });
        } catch (err) {
            // A limiter outage should not take the whole API down with it.
            console.error("[RATE LIMIT] Redis unavailable:", err.message);
            return next();
        }

        if (count > max) {
            res.set("Retry-After", String(Math.ceil(ttlMs / 1000)));
            throw new AppError(429, "Too many requests, try again later", "RATE_LIMITED");
        }

        next();
    };
}
