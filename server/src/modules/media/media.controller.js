import { asyncHandler } from "../../lib/asyncHandler.js";
import * as mediaService from "./media.service.js";

import { generateUploadSignature, isOwnMediaUrl } from "../../lib/cloudinary.js";
import { z } from "zod";

export const getUploadSignature = asyncHandler(async (req, res) => {
    const signatureData = generateUploadSignature();
    res.json(signatureData);
});

const saveMetadataSchema = z.object({
    storageId: z.string().max(2048).refine(isOwnMediaUrl, "Unrecognized media URL"),
    fileName: z.string().min(1).max(255),
    mimeType: z.string().max(100),
    fileSize: z.number().int().positive(),
});

export const saveMediaMetadata = asyncHandler(async (req, res) => {
    const body = saveMetadataSchema.parse(req.body);
    const media = await mediaService.saveMetadata(req.user.id, body);
    res.status(201).json({ media });
});

export const downloadMedia = asyncHandler(async (req, res) => {
    const { redirectUrl } = await mediaService.download(
        req.params.mediaId,
        req.user.id,
    );

    res.redirect(redirectUrl);
});
