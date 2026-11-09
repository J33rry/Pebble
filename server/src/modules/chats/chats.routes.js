import { Router } from "express";
import * as ctrl from "./chats.controller.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import {
    requireChatParticipant,
    requireChatAdmin,
} from "../../middleware/chatAccess.js";
import { rateLimiter, byUser } from "../../middleware/rateLimiter.js";

const router = Router();

router.use(requireAuth());

const createLimiter = rateLimiter({ name: "chat-create", max: 30, keyFn: byUser });

router.get("/", ctrl.listChats);
router.post("/", createLimiter, ctrl.createChat);

// Declared before /:chatId routes that could otherwise shadow them.
router.patch(
    "/:chatId/preferences",
    requireChatParticipant,
    ctrl.updateMyChatPreferences,
);

router.get("/:chatId/media/counts", requireChatParticipant, ctrl.getChatMediaCounts);
router.get("/:chatId/media", requireChatParticipant, ctrl.listChatMedia);

router.get("/:chatId", requireChatParticipant, ctrl.getChat);
router.patch("/:chatId", requireChatAdmin, ctrl.updateChat);
router.delete("/:chatId", requireChatAdmin, ctrl.deleteChat);

router.post("/:chatId/participants", requireChatAdmin, ctrl.addParticipants);
router.patch(
    "/:chatId/participants/:userId",
    requireChatAdmin,
    ctrl.updateParticipant,
);
router.delete(
    "/:chatId/participants/:userId",
    requireChatParticipant,
    ctrl.removeParticipant,
);

export default router;
