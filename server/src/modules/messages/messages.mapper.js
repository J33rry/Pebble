// Repository rows are flat; the API nests sender and media details.
export function toMessageResponse(row) {
    const {
        senderUsername,
        senderDisplayName,
        senderAvatarUrl,
        mediaUrl,
        mediaFileName,
        mediaMimeType,
        ...message
    } = row;

    message.sender = {
        id: row.senderId,
        username: senderUsername,
        displayName: senderDisplayName,
        avatarUrl: senderAvatarUrl,
    };

    if (mediaUrl) {
        message.media = {
            id: row.mediaId,
            url: mediaUrl,
            filename: mediaFileName,
            mimeType: mediaMimeType,
        };
    }

    return message;
}
