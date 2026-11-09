import { AppError } from "../../lib/AppError.js";
import * as repo from "./folders.repository.js";

// Folders live in the nav rail, which only has room for so many.
export const MAX_FOLDERS = 10;

export async function listFolders(userId) {
    const [folders, unreadByFolder] = await Promise.all([
        repo.findUserFolders(userId),
        repo.findFolderUnreadCounts(userId),
    ]);

    return folders.map((f) => ({
        ...f,
        unreadCount: unreadByFolder.get(f.id) || 0,
    }));
}

// 23505 = unique_violation; the only unique constraint here is (user_id, name).
// Drizzle wraps the driver error, so the pg code sits on `cause`.
function rethrowDuplicateName(err) {
    if (err?.code === "23505" || err?.cause?.code === "23505") {
        throw new AppError(409, "You already have a folder with that name", "DUPLICATE_NAME");
    }
    throw err;
}

export async function createFolder(userId, data) {
    try {
        const folder = await repo.createFolderWithinLimit(userId, data, MAX_FOLDERS);
        if (!folder) {
            throw new AppError(
                409,
                `You can have up to ${MAX_FOLDERS} folders. Delete one to make room.`,
                "FOLDER_LIMIT",
            );
        }
        return folder;
    } catch (err) {
        rethrowDuplicateName(err);
    }
}

export async function updateFolder(folderId, patch) {
    try {
        return await repo.updateFolder(folderId, patch);
    } catch (err) {
        rethrowDuplicateName(err);
    }
}

export async function deleteFolder(folderId) {
    // chat_folder_items cascades; the chats themselves are untouched.
    await repo.deleteFolder(folderId);
}

export async function addChatToFolder(folderId, chatId, userId) {
    if (!(await repo.isChatParticipant(chatId, userId))) {
        throw new AppError(403, "Not a participant of this chat", "FORBIDDEN");
    }
    await repo.addChatToFolder(folderId, chatId);
    return repo.findChatIdsInFolder(folderId);
}

export async function removeChatFromFolder(folderId, chatId) {
    await repo.removeChatFromFolder(folderId, chatId);
    return repo.findChatIdsInFolder(folderId);
}

export async function listFolderChatIds(folderId) {
    return repo.findChatIdsInFolder(folderId);
}
