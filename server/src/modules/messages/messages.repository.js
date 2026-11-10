import { db } from "../../db/index.js";
import {
    messages,
    messageReactions,
    messageStatus,
    users,
    media,
} from "../../db/schema/index.js";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { findMentionsForMessages } from "./messageInteractions.repository.js";

// Keyset condition for "older than this message". The cursor is compared inside
// the query because created_at has microsecond precision, and reading it into a
// JS Date first would truncate it and skip messages from the same millisecond.
// `id` breaks exact ties. An id from another chat matches nothing.
export function beforeMessageCursor(chatId, messageId) {
    return sql`(${messages.createdAt}, ${messages.id}) < (
        SELECT cursor_message.created_at, cursor_message.id
        FROM messages cursor_message
        WHERE cursor_message.id = ${messageId}
          AND cursor_message.chat_id = ${chatId}
    )`;
}

// Returns the existing message with created: false when clientMessageId has
// already been used, so a retry is harmless.
export async function createMessage(data) {
    const [inserted] = await db
        .insert(messages)
        .values(data)
        .onConflictDoNothing({
            target: [messages.chatId, messages.senderId, messages.clientMessageId],
        })
        .returning();

    let message = inserted;
    if (!message) {
        [message] = await db
            .select()
            .from(messages)
            .where(
                and(
                    eq(messages.chatId, data.chatId),
                    eq(messages.senderId, data.senderId),
                    eq(messages.clientMessageId, data.clientMessageId),
                ),
            )
            .limit(1);
    }

    if (message.mediaId) {
        const [m] = await db.select().from(media).where(eq(media.id, message.mediaId)).limit(1);
        if (m) {
            message.mediaUrl = m.storageId;
            message.mediaFileName = m.fileName;
            message.mediaMimeType = m.mimeType;
        }
    }
    
    // Include sender details for the WS payload
    const [u] = await db.select().from(users).where(eq(users.id, message.senderId)).limit(1);
    if (u) {
        message.senderUsername = u.username;
        message.senderDisplayName = u.displayName;
        message.senderAvatarUrl = u.avatarUrl;
    }

    return { message, created: !!inserted };
}

export async function findMessageById(id) {
    const [message] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, id))
        .limit(1);
    return message;
}

export async function findMessages(chatId, { before, limit }) {
    const conditions = [eq(messages.chatId, chatId)];

    if (before) conditions.push(beforeMessageCursor(chatId, before));

    const fetchedMessages = await db
        .select({
            id: messages.id,
            chatId: messages.chatId,
            senderId: messages.senderId,
            replyToMessageId: messages.replyToMessageId,
            type: messages.type,
            content: messages.content,
            mediaId: messages.mediaId,
            isEdited: messages.isEdited,
            isDeleted: messages.isDeleted,
            createdAt: messages.createdAt,
            updatedAt: messages.updatedAt,
            senderUsername: users.username,
            senderDisplayName: users.displayName,
            senderAvatarUrl: users.avatarUrl,
            mediaUrl: media.storageId,
            mediaFileName: media.fileName,
            mediaMimeType: media.mimeType,
        })
        .from(messages)
        .innerJoin(users, eq(users.id, messages.senderId))
        .leftJoin(media, eq(media.id, messages.mediaId))
        .where(and(...conditions))
        .orderBy(desc(messages.createdAt), desc(messages.id))
        .limit(limit);

    if (fetchedMessages.length === 0) return fetchedMessages;

    const messageIds = fetchedMessages.map(m => m.id);

    const reactions = await db
        .select()
        .from(messageReactions)
        .where(inArray(messageReactions.messageId, messageIds));
        
    const reactionsByMsg = new Map();
    reactions.forEach(r => {
        if (!reactionsByMsg.has(r.messageId)) reactionsByMsg.set(r.messageId, []);
        reactionsByMsg.get(r.messageId).push(r);
    });

    const statuses = await db
        .select()
        .from(messageStatus)
        .where(inArray(messageStatus.messageId, messageIds));
        
    const statusByMsg = new Map();
    statuses.forEach(s => {
        if (!statusByMsg.has(s.messageId)) statusByMsg.set(s.messageId, []);
        statusByMsg.get(s.messageId).push(s);
    });

    const mentionsByMsg = await findMentionsForMessages(messageIds);

    return fetchedMessages.map(m => ({
        ...m,
        reactions: reactionsByMsg.get(m.id) || [],
        status: statusByMsg.get(m.id) || [],
        mentions: mentionsByMsg.get(m.id) || [],
    }));
}

export async function updateMessage(id, data) {
    const [message] = await db
        .update(messages)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(messages.id, id))
        .returning();
    return message;
}

export async function softDeleteMessage(id) {
    return updateMessage(id, { isDeleted: true, content: null });
}

// One DISTINCT ON query rather than one query per chat.
export async function findLatestMessagesForChats(chatIds) {
    if (chatIds.length === 0) return new Map();

    const result = await db.execute(sql`
        SELECT DISTINCT ON (m.chat_id)
            m.id, m.chat_id, m.sender_id, m.content, m.type,
            m.is_deleted, m.created_at,
            u.username AS sender_username,
            u.display_name AS sender_display_name
        FROM messages m
        LEFT JOIN users u ON u.id = m.sender_id
        WHERE m.chat_id IN (${sql.join(
            chatIds.map((id) => sql`${id}::uuid`),
            sql`, `,
        )})
        ORDER BY m.chat_id, m.created_at DESC
    `);

    return new Map(
        result.rows.map((r) => [
            r.chat_id,
            {
                id: r.id,
                chatId: r.chat_id,
                senderId: r.sender_id,
                content: r.content,
                type: r.type,
                isDeleted: r.is_deleted,
                createdAt: r.created_at,
                senderUsername: r.sender_username,
                senderDisplayName: r.sender_display_name,
            },
        ]),
    );
}
