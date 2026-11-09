import { z } from "zod";
import "dotenv/config";

const envSchema = z
    .object({
        NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
        PORT: z.coerce.number().default(5000),

        DATABASE_URL: z.string().url(),

        REDIS_URL: z.string().default("redis://localhost:6379"),

        SESSION_SECRET: z.string().min(32),
        JWT_SECRET: z.string().min(32),

        GOOGLE_CLIENT_ID: z.string().optional(),
        CORS_ORIGIN: z.string().default("http://localhost:3000"),

        // LiveKit Config
        LIVEKIT_URL: z.string().url().default("http://localhost:7880"),
        LIVEKIT_API_KEY: z.string().default("devkey"),
        LIVEKIT_API_SECRET: z.string().default("secret"),

        // Cloudinary Config
        CLOUDINARY_CLOUD_NAME: z.string().default("demo"),
        CLOUDINARY_API_KEY: z.string().default("test_key"),
        CLOUDINARY_API_SECRET: z.string().default("test_secret"),

        // Email (password reset). Any SMTP provider works.
        SMTP_HOST: z.string().optional(),
        SMTP_PORT: z.coerce.number().default(587),
        SMTP_USER: z.string().optional(),
        SMTP_PASS: z.string().optional(),
        EMAIL_FROM: z.string().optional(),
    })
    .superRefine((e, ctx) => {
        if (e.NODE_ENV !== "production") return;

        // The defaults above exist for local development only. Starting in
        // production with any of them would leave a publicly known credential
        // in use, so refuse to boot instead.
        const fail = (path, message) =>
            ctx.addIssue({ code: "custom", path: [path], message });

        if (!e.GOOGLE_CLIENT_ID) fail("GOOGLE_CLIENT_ID", "Required in production");
        if (e.LIVEKIT_API_KEY === "devkey") fail("LIVEKIT_API_KEY", "Must not use the dev default");
        if (e.LIVEKIT_API_SECRET === "secret") fail("LIVEKIT_API_SECRET", "Must not use the dev default");
        if (e.CLOUDINARY_CLOUD_NAME === "demo") fail("CLOUDINARY_CLOUD_NAME", "Must not use the dev default");
        if (e.CLOUDINARY_API_KEY === "test_key") fail("CLOUDINARY_API_KEY", "Must not use the dev default");
        if (e.CLOUDINARY_API_SECRET === "test_secret") fail("CLOUDINARY_API_SECRET", "Must not use the dev default");
        if (e.SESSION_SECRET.startsWith("change-me")) fail("SESSION_SECRET", "Must not use the example value");
        if (e.JWT_SECRET.startsWith("change-me")) fail("JWT_SECRET", "Must not use the example value");
        if (e.SESSION_SECRET === e.JWT_SECRET) fail("JWT_SECRET", "Must differ from SESSION_SECRET");
    });

export const env = envSchema.parse(process.env);
