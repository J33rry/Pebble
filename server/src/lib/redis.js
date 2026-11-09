import { createClient } from "redis";
import { env } from "../config/env.js";

export const redisClient = createClient({ url: env.REDIS_URL });
redisClient.on("error", (err) => console.error("[REDIS]", err));
await redisClient.connect();
