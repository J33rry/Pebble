import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";

cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
});

/**
 * Generates an upload signature for client-side direct uploads.
 * The client needs this signature, the timestamp, and the api_key to upload securely.
 */
export function generateUploadSignature() {
    const timestamp = Math.round(new Date().getTime() / 1000);
    // You can add folder names or other signed params here if needed.
    const signature = cloudinary.utils.api_sign_request(
        {
            timestamp: timestamp,
            folder: "chat_media", // Optional: organize uploads into a folder
        },
        env.CLOUDINARY_API_SECRET,
    );

    return {
        signature,
        timestamp,
        apiKey: env.CLOUDINARY_API_KEY,
        cloudName: env.CLOUDINARY_CLOUD_NAME,
        folder: "chat_media",
    };
}

/**
 * True only for an asset delivered from this account's upload folder. Media
 * URLs are rendered for and redirected to other users, so nothing else may be
 * stored or served as one.
 */
export function isOwnMediaUrl(value) {
    let url;
    try {
        url = new URL(value);
    } catch {
        return false;
    }

    return (
        url.protocol === "https:" &&
        url.hostname === "res.cloudinary.com" &&
        url.pathname.startsWith(`/${env.CLOUDINARY_CLOUD_NAME}/`) &&
        /\/(image|video|raw)\/upload\/(v\d+\/)?chat_media\//.test(url.pathname)
    );
}

export default cloudinary;
