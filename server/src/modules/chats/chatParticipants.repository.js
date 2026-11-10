import { db } from "../../db/index.js";
import { chats, chatParticipants, users } from "../../db/schema/index.js";
import { eq, and, or, lt, inArray, isNull } from "drizzle-orm";
import { AppError } from "../../lib/AppError.js";

// Batched sibling of findChatParticipants, to keep listChats off an N+1.
export async function findChatParticipantsForChats(chatIds) {
    if (chatIds.length === 0) return [];
    return db
        .select({
            id: chatParticipants.id,
            chatId: chatParticipants.chatId,
            userId: chatParticipants.userId,
            role: chatParticipants.role,
            joinedAt: chatParticipants.joinedAt,
            username: users.username,
            displayName: users.displayName,
            avatarUrl: users.avatarUrl,
            lastSeenAt: users.lastSeenAt,
        })
        .from(chatParticipants)
        .innerJoin(users, eq(users.id, chatParticipants.userId))
        .where(inArray(chatParticipants.chatId, chatIds));
}

// Guarded so an out-of-order ack can never rewind the badge.
export async function advanceLastReadAt(chatId, userId, readAt = new Date()) {
    await db
        .update(chatParticipants)
        .set({ lastReadAt: readAt })
        .where(
            and(
                eq(chatParticipants.chatId, chatId),
                eq(chatParticipants.userId, userId),
                or(
                    isNull(chatParticipants.lastReadAt),
                    lt(chatParticipants.lastReadAt, readAt),
                ),
            ),
        );
}

export async function updateParticipantPreferences(chatId, userId, prefs) {
    const [row] = await db
        .update(chatParticipants)
        .set(prefs)
        .where(
            and(
                eq(chatParticipants.chatId, chatId),
                eq(chatParticipants.userId, userId),
            ),
        )
        .returning();
    return row;
}

// Returns only the rows actually added; existing members are left untouched.
export async function addMissingParticipants(chatId, userIds) {
    return db
        .insert(chatParticipants)
        .values(userIds.map((userId) => ({ chatId, userId, role: "member" })))
        .onConflictDoNothing({
            target: [chatParticipants.chatId, chatParticipants.userId],
        })
        .returning();
}

export async function findParticipant(chatId, userId) {
    const [p] = await db
        .select()
        .from(chatParticipants)
        .where(
            and(
                eq(chatParticipants.chatId, chatId),
                eq(chatParticipants.userId, userId),
            ),
        )
        .limit(1);
    return p;
}

export async function findChatParticipants(chatId) {
    return db
        .select({
            id: chatParticipants.id,
            userId: chatParticipants.userId,
            role: chatParticipants.role,
            joinedAt: chatParticipants.joinedAt,
            username: users.username,
            displayName: users.displayName,
            avatarUrl: users.avatarUrl,
            lastSeenAt: users.lastSeenAt,
        })
        .from(chatParticipants)
        .innerJoin(users, eq(users.id, chatParticipants.userId))
        .where(eq(chatParticipants.chatId, chatId));
}

export async function getChatParticipantUserIds(chatId) {
    const rows = await db
        .select({ userId: chatParticipants.userId })
        .from(chatParticipants)
        .where(eq(chatParticipants.chatId, chatId));
    return rows.map((r) => r.userId);
}

// Admin rows are locked so two admins demoting each other at the same moment
// cannot leave the group with none.
export async function updateParticipantRole(chatId, userId, role) {
    return db.transaction(async (tx) => {
        const admins = await tx
            .select({ userId: chatParticipants.userId })
            .from(chatParticipants)
            .where(
                and(
                    eq(chatParticipants.chatId, chatId),
                    eq(chatParticipants.role, "admin"),
                ),
            )
            .for("update");

        if (role !== "admin" && admins.length === 1 && admins[0].userId === userId) {
            throw new AppError(400, "A group needs at least one admin", "LAST_ADMIN");
        }

        const [participant] = await tx
            .update(chatParticipants)
            .set({ role })
            .where(
                and(
                    eq(chatParticipants.chatId, chatId),
                    eq(chatParticipants.userId, userId),
                ),
            )
            .returning();
        return participant;
    });
}

// Removes a member as one unit: a group's last admin hands over to its longest
// standing member, and a group left with nobody is deleted.
export async function removeMember(chatId, userId, { isGroup }) {
    return db.transaction(async (tx) => {
        const members = await tx
            .select()
            .from(chatParticipants)
            .where(eq(chatParticipants.chatId, chatId))
            .orderBy(chatParticipants.joinedAt)
            .for("update");

        const target = members.find((m) => m.userId === userId);
        if (!target) return { removed: false, chatDeleted: false };

        const remaining = members.filter((m) => m.userId !== userId);

        if (isGroup && remaining.length === 0) {
            await tx.delete(chats).where(eq(chats.id, chatId));
            return { removed: true, chatDeleted: true };
        }

        if (
            isGroup &&
            target.role === "admin" &&
            !remaining.some((m) => m.role === "admin")
        ) {
            await tx
                .update(chatParticipants)
                .set({ role: "admin" })
                .where(eq(chatParticipants.id, remaining[0].id));
        }

        await tx.delete(chatParticipants).where(eq(chatParticipants.id, target.id));
        return { removed: true, chatDeleted: false };
    });
}
