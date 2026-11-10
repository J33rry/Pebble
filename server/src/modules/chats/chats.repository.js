import { db } from "../../db/index.js";
import { chats, chatParticipants } from "../../db/schema/index.js";
import { eq, and, desc, sql, isNull, isNotNull } from "drizzle-orm";

export async function findChatById(id) {
    const [chat] = await db
        .select()
        .from(chats)
        .where(eq(chats.id, id))
        .limit(1);
    return chat;
}

export async function updateChat(id, data) {
    const [chat] = await db
        .update(chats)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(chats.id, id))
        .returning();
    return chat;
}

/**
 * `archived`: true → only archived, false → only non-archived,
 * undefined → every chat regardless (used by presence fan-out).
 */
export async function findUserChats(userId, { archived } = {}) {
    const archivedFilter =
        archived === undefined
            ? undefined
            : archived
              ? isNotNull(chatParticipants.archivedAt)
              : isNull(chatParticipants.archivedAt);

    // Pinned first, then most recently active.
    const userChats = await db
        .select({
            chat: chats,
            role: chatParticipants.role,
            lastReadAt: chatParticipants.lastReadAt,
            pinnedAt: chatParticipants.pinnedAt,
            archivedAt: chatParticipants.archivedAt,
            isMuted: chatParticipants.isMuted,
        })
        .from(chatParticipants)
        .innerJoin(chats, eq(chats.id, chatParticipants.chatId))
        .where(and(eq(chatParticipants.userId, userId), archivedFilter))
        .orderBy(
            sql`${chatParticipants.pinnedAt} DESC NULLS LAST`,
            desc(chats.updatedAt),
        );

    return userChats;
}

// One aggregate for every chat the user is in, so the chat list stays flat.
// Returns both the unread total and how many of those mention the user.
export async function findUnreadCountsForUser(userId) {
    const result = await db.execute(sql`
        SELECT cp.chat_id AS chat_id,
               COUNT(m.id)::int AS unread_count,
               COUNT(mm.message_id)::int AS mention_count
        FROM chat_participants cp
        LEFT JOIN messages m
          ON m.chat_id = cp.chat_id
         AND m.sender_id <> cp.user_id
         AND m.is_deleted = false
         AND m.created_at > COALESCE(cp.last_read_at, cp.joined_at)
        LEFT JOIN message_mentions mm
          ON mm.message_id = m.id
         AND mm.user_id = cp.user_id
        WHERE cp.user_id = ${userId}
        GROUP BY cp.chat_id
    `);
    return new Map(
        result.rows.map((r) => [
            r.chat_id,
            { unread: r.unread_count, mentions: r.mention_count },
        ]),
    );
}

async function findDmBetween(userA, userB, executor) {
    // Find an existing DM chat between two users
    const result = await executor.execute(sql`
        SELECT c.id FROM chats c
        WHERE c.type = 'dm'
        AND EXISTS (
            SELECT 1 FROM chat_participants cp1
            WHERE cp1.chat_id = c.id AND cp1.user_id = ${userA}
        )
        AND EXISTS (
            SELECT 1 FROM chat_participants cp2
            WHERE cp2.chat_id = c.id AND cp2.user_id = ${userB}
        )
        LIMIT 1
    `);
    return result.rows[0]?.id || null;
}

// The lock is per user pair and held until commit, so two simultaneous requests
// cannot both see "no DM yet" and create one each.
export async function findOrCreateDm(userId, otherUserId) {
    return db.transaction(async (tx) => {
        const lockKey = [userId, otherUserId].sort().join(":");
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`);

        const existingId = await findDmBetween(userId, otherUserId, tx);
        if (existingId) {
            const [chat] = await tx.select().from(chats).where(eq(chats.id, existingId));
            return { chat, created: false };
        }

        const [chat] = await tx
            .insert(chats)
            .values({ type: "dm", createdBy: userId })
            .returning();
        await tx.insert(chatParticipants).values([
            { chatId: chat.id, userId, role: "member" },
            { chatId: chat.id, userId: otherUserId, role: "member" },
        ]);
        return { chat, created: true };
    });
}

export async function createGroupChat({ name, description, createdBy }, memberIds) {
    return db.transaction(async (tx) => {
        const [chat] = await tx
            .insert(chats)
            .values({ type: "group", name, description, createdBy })
            .returning();
        await tx.insert(chatParticipants).values([
            { chatId: chat.id, userId: createdBy, role: "admin" },
            ...memberIds.map((userId) => ({ chatId: chat.id, userId, role: "member" })),
        ]);
        return chat;
    });
}

export async function deleteChat(chatId) {
    await db.delete(chats).where(eq(chats.id, chatId));
}
