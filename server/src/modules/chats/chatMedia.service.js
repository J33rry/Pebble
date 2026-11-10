import * as repo from "./chatMedia.repository.js";

const URL_RE = /https?:\/\/[^\s<>"')]+/gi;

export async function listChatMedia(chatId, { kind, before, limit }) {
    if (kind === "link") {
        const rows = await repo.findChatLinks(chatId, { before, limit });
        // One message can carry several links; flatten them into entries.
        const items = [];
        for (const row of rows) {
            const urls = row.content?.match(URL_RE) || [];
            for (const [i, url] of urls.entries()) {
                let host = null;
                try {
                    host = new URL(url).host;
                } catch {
                    // Keep the raw URL even if it doesn't parse.
                }
                items.push({
                    id: `${row.messageId}:${i}`,
                    messageId: row.messageId,
                    url,
                    host,
                    createdAt: row.createdAt,
                    sender: {
                        id: row.senderId,
                        username: row.senderUsername,
                        displayName: row.senderDisplayName,
                    },
                });
            }
        }
        return items;
    }

    const rows = await repo.findChatMedia(chatId, { kind, before, limit });
    return rows.map((r) => ({
        id: r.mediaId,
        messageId: r.messageId,
        type: r.type,
        url: r.url,
        fileName: r.fileName,
        mimeType: r.mimeType,
        // bigint is not JSON-serialisable.
        fileSize: r.fileSize == null ? null : Number(r.fileSize),
        createdAt: r.createdAt,
        sender: {
            id: r.senderId,
            username: r.senderUsername,
            displayName: r.senderDisplayName,
        },
    }));
}

export async function getChatMediaCounts(chatId) {
    return repo.countChatMediaByKind(chatId);
}
