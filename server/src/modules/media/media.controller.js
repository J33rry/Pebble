import { asyncHandler } from "../../lib/asyncHandler.js";
import { generateUploadSignature } from "../../lib/cloudinary.js";
import * as mediaService from "./media.service.js";
import * as v from "./media.validation.js";

export const getUploadSignature = asyncHandler(async (_req, res) => {
    res.json(generateUploadSignature());
});

export const saveMediaMetadata = asyncHandler(async (req, res) => {
    const body = v.saveMetadataSchema.parse(req.body);
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
