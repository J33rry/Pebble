import { z } from "zod";
import { isOwnMediaUrl } from "../../lib/cloudinary.js";

export const saveMetadataSchema = z.object({
    storageId: z.string().max(2048).refine(isOwnMediaUrl, "Unrecognized media URL"),
    fileName: z.string().min(1).max(255),
    mimeType: z.string().max(100),
    fileSize: z.number().int().positive(),
});
