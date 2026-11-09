import { Router } from "express";
import * as ctrl from "./contacts.controller.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { rateLimiter, byUser } from "../../middleware/rateLimiter.js";

const router = Router();

router.use(requireAuth());

const requestLimiter = rateLimiter({ name: "contact-request", max: 30, keyFn: byUser });

router.get("/", ctrl.listContacts);
router.post("/", requestLimiter, ctrl.addContact);
router.patch("/:contactId", ctrl.updateContact);
router.delete("/:contactId", ctrl.removeContact);

export default router;
