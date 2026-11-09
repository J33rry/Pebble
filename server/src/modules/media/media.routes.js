import { Router } from "express";
import * as ctrl from "./media.controller.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { rateLimiter, byUser } from "../../middleware/rateLimiter.js";

const router = Router();

router.use(requireAuth());

const signatureLimiter = rateLimiter({ name: "upload-signature", max: 30, keyFn: byUser });
const saveLimiter = rateLimiter({ name: "upload-save", max: 30, keyFn: byUser });

router.get("/signature", signatureLimiter, ctrl.getUploadSignature);
router.post("/", saveLimiter, ctrl.saveMediaMetadata);
router.get("/:mediaId", ctrl.downloadMedia);

export default router;
