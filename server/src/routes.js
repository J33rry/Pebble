import { Router } from "express";

import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import contactsRoutes from "./modules/contacts/contacts.routes.js";
import chatsRoutes from "./modules/chats/chats.routes.js";
import messagesRoutes from "./modules/messages/messages.routes.js";
import mediaRoutes from "./modules/media/media.routes.js";
import foldersRoutes from "./modules/folders/folders.routes.js";
import callsRoutes from "./modules/calls/calls.routes.js";

const router = Router();

router.get("/health", (_req, res) => res.json({ status: "ok" }));

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/contacts", contactsRoutes);
router.use("/chats", chatsRoutes);
// Message routes are scoped under /chats/:chatId/messages.
router.use("/chats", messagesRoutes);
router.use("/media", mediaRoutes);
router.use("/folders", foldersRoutes);
// Call routes include both /chats/:chatId/calls and /calls/:callId/*.
router.use("/", callsRoutes);

export default router;
