import { db } from "../../db/index.js";
import {
    messages,
    messageReactions,
    messageStatus,
    messageMentions,
    users,
} from "../../db/schema/index.js";
import { eq, and, inArray, sql } from "drizzle-orm";

export async function upsertReaction(messageId, userId, reaction) {
    const [existing] = await db
        .select()
        .from(messageReactions)
        .where(
            and(
                eq(messageReactions.messageId, messageId),
                eq(messageReactions.userId, userId),
                eq(messageReactions.reaction, reaction),
            ),
        )
        .limit(1);

    if (existing) return existing;

    const [r] = await db
        .insert(messageReactions)
        .values({ messageId, userId, reaction })
        .returning();
    return r;
}

export async function removeReaction(messageId, userId, reaction) {
    await db
        .delete(messageReactions)
        .where(
            and(
                eq(messageReactions.messageId, messageId),
                eq(messageReactions.userId, userId),
                eq(messageReactions.reaction, reaction),
            ),
        );
}

export async function markRead(chatId, messageIds, userId) {
    // Ignore ids from other chats: the caller only proved membership of this one.
    const inChat = await db
        .select({ id: messages.id })
        .from(messages)
        .where(and(eq(messages.chatId, chatId), inArray(messages.id, messageIds)));

    if (inChat.length === 0) return;

    const now = new Date();
    await db
        .insert(messageStatus)
        .values(inChat.map(({ id }) => ({ messageId: id, userId, deliveredAt: now, readAt: now })))
        .onConflictDoUpdate({
            target: [messageStatus.messageId, messageStatus.userId],
            set: { readAt: sql`COALESCE(message_status.read_at, EXCLUDED.read_at)` },
        });
}

export async function replaceMentions(messageId, userIds) {
    await db
        .delete(messageMentions)
        .where(eq(messageMentions.messageId, messageId));

    if (userIds.length === 0) return;

    await db
        .insert(messageMentions)
        .values(userIds.map((userId) => ({ messageId, userId })))
        .onConflictDoNothing();
}

export async function findMentionsForMessages(messageIds) {
    if (messageIds.length === 0) return new Map();

    const rows = await db
        .select({
            messageId: messageMentions.messageId,
            userId: messageMentions.userId,
            username: users.username,
            displayName: users.displayName,
        })
        .from(messageMentions)
        .innerJoin(users, eq(users.id, messageMentions.userId))
        .where(inArray(messageMentions.messageId, messageIds));

    const byMessage = new Map();
    for (const r of rows) {
        if (!byMessage.has(r.messageId)) byMessage.set(r.messageId, []);
        byMessage.get(r.messageId).push({
            userId: r.userId,
            username: r.username,
            displayName: r.displayName,
        });
    }
    return byMessage;
}
