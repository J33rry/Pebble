import { Router } from "express";
import * as ctrl from "./users.controller.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { rateLimiter, byUser } from "../../middleware/rateLimiter.js";

const router = Router();

router.use(requireAuth());

const searchLimiter = rateLimiter({ name: "user-search", max: 60, keyFn: byUser });

router.get("/me", ctrl.getMe);
router.patch("/me", ctrl.updateMe);
router.get("/search", searchLimiter, ctrl.searchUsers);
router.get("/:userId", ctrl.getUser);

export default router;
