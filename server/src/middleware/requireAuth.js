import { AppError } from "../lib/AppError.js";
import { db } from "../db/index.js";
import { users } from "../db/schema/index.js";
import { eq } from "drizzle-orm";

export function requireAuth() {
    return async (req, _res, next) => {
        if (!req.session?.userId) {
            throw new AppError(401, "Authentication required", "UNAUTHENTICATED");
        }

        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, req.session.userId))
            .limit(1);

        // Sessions from before the last password change or reset no longer count.
        if (
            !user ||
            user.deletedAt ||
            (req.session.sessionVersion ?? 0) !== user.sessionVersion
        ) {
            req.session.destroy(() => {});
            throw new AppError(401, "User not found", "UNAUTHENTICATED");
        }

        req.user = user;
        next();
    };
}
