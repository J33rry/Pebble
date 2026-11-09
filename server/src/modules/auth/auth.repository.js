import { db } from "../../db/index.js";
import { users } from "../../db/schema/index.js";
import { eq, sql } from "drizzle-orm";

// Assign to sessionVersion in updateUser to sign out every existing session.
export const nextSessionVersion = sql`${users.sessionVersion} + 1`;

export async function createUser(data) {
    const [user] = await db.insert(users).values(data).returning();
    return user;
}

export async function findUserByEmail(email) {
    const [user] = await db
        .select()
        .from(users)
        // lower() so accounts created before addresses were normalized still match.
        .where(eq(sql`lower(${users.email})`, email.toLowerCase()))
        .limit(1);
    return user;
}

export async function findUserById(id) {
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
    return user;
}

export async function updateUser(id, data) {
    const [user] = await db
        .update(users)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
    return user;
}

