import { Router } from "express";
import * as ctrl from "./calls.controller.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireChatParticipant } from "../../middleware/chatAccess.js";
import { requireCallAccess } from "../../middleware/callAccess.js";
import { rateLimiter, byUser } from "../../middleware/rateLimiter.js";

const router = Router();

router.use(requireAuth());

const startLimiter = rateLimiter({ name: "call-start", max: 20, keyFn: byUser });

// Global call history
router.get("/calls", ctrl.getUserCallHistory);

// Chat-scoped call routes
router.post("/chats/:chatId/calls", startLimiter, requireChatParticipant, ctrl.initiateCall);
router.get(
    "/chats/:chatId/calls",
    requireChatParticipant,
    ctrl.getChatCallHistory,
);

// Call-scoped routes (all require the user to be a participant of the call's chat)
router.post("/calls/:callId/join", requireCallAccess, ctrl.joinCall);
router.post("/calls/:callId/leave", requireCallAccess, ctrl.leaveCall);
router.post("/calls/:callId/end", requireCallAccess, ctrl.endCall);
router.get("/calls/:callId/participants", requireCallAccess, ctrl.getCallParticipants);
router.post("/calls/:callId/token", requireCallAccess, ctrl.getCallToken);

export default router;
