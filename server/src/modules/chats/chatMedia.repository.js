import { db } from "../../db/index.js";
import { messages, media, users } from "../../db/schema/index.js";
import { eq, and, desc, sql, inArray, isNotNull } from "drizzle-orm";
import { beforeMessageCursor } from "../messages/messages.repository.js";

const MEDIA_KINDS = ["image", "video", "audio", "file"];

export async function findChatMedia(chatId, { kind, before, limit = 30 }) {
    const conditions = [
        eq(messages.chatId, chatId),
        eq(messages.isDeleted, false),
        isNotNull(messages.mediaId),
        kind ? eq(messages.type, kind) : inArray(messages.type, MEDIA_KINDS),
    ];

    if (before) conditions.push(beforeMessageCursor(chatId, before));

    return db
        .select({
            messageId: messages.id,
            type: messages.type,
            createdAt: messages.createdAt,
            senderId: messages.senderId,
            senderUsername: users.username,
            senderDisplayName: users.displayName,
            mediaId: media.id,
            url: media.storageId,
            fileName: media.fileName,
            mimeType: media.mimeType,
            fileSize: media.fileSize,
        })
        .from(messages)
        .innerJoin(media, eq(media.id, messages.mediaId))
        .innerJoin(users, eq(users.id, messages.senderId))
        .where(and(...conditions))
        .orderBy(desc(messages.createdAt), desc(messages.id))
        .limit(limit);
}

// Links are not stored separately — they're extracted from message text.
// A dedicated table only becomes worthwhile if we add link previews.
export async function findChatLinks(chatId, { before, limit = 30 }) {
    const conditions = [
        eq(messages.chatId, chatId),
        eq(messages.isDeleted, false),
        sql`${messages.content} ~* 'https?://'`,
    ];

    if (before) conditions.push(beforeMessageCursor(chatId, before));

    return db
        .select({
            messageId: messages.id,
            content: messages.content,
            createdAt: messages.createdAt,
            senderId: messages.senderId,
            senderUsername: users.username,
            senderDisplayName: users.displayName,
        })
        .from(messages)
        .innerJoin(users, eq(users.id, messages.senderId))
        .where(and(...conditions))
        .orderBy(desc(messages.createdAt), desc(messages.id))
        .limit(limit);
}

// One grouped query so all five tabs render from a single request.
export async function countChatMediaByKind(chatId) {
    const result = await db.execute(sql`
        SELECT m.type AS kind, COUNT(*)::int AS count
        FROM messages m
        WHERE m.chat_id = ${chatId}
          AND m.is_deleted = false
          AND m.media_id IS NOT NULL
        GROUP BY m.type
        UNION ALL
        SELECT 'link' AS kind, COUNT(*)::int AS count
        FROM messages m
        WHERE m.chat_id = ${chatId}
          AND m.is_deleted = false
          AND m.content ~* 'https?://'
    `);

    const counts = { image: 0, video: 0, audio: 0, file: 0, link: 0 };
    for (const row of result.rows) {
        if (row.kind in counts) counts[row.kind] = row.count;
    }
    return counts;
}
