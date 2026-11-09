import { Router } from "express";
import * as ctrl from "./auth.controller.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { rateLimiter, byEmail, byUser } from "../../middleware/rateLimiter.js";

const router = Router();

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const registerLimiter = rateLimiter({ name: "register", windowMs: HOUR, max: 10 });
const loginIpLimiter = rateLimiter({ name: "login-ip", windowMs: MINUTE, max: 10 });
const loginEmailLimiter = rateLimiter({ name: "login-email", windowMs: 15 * MINUTE, max: 10, keyFn: byEmail });
const googleLimiter = rateLimiter({ name: "login-google", windowMs: MINUTE, max: 10 });
const forgotIpLimiter = rateLimiter({ name: "forgot-ip", windowMs: MINUTE, max: 3 });
const forgotEmailLimiter = rateLimiter({ name: "forgot-email", windowMs: HOUR, max: 3, keyFn: byEmail });
const resetLimiter = rateLimiter({ name: "reset", windowMs: 15 * MINUTE, max: 10 });
const changeLimiter = rateLimiter({ name: "password-change", windowMs: 15 * MINUTE, max: 10, keyFn: byUser });

// Registration
router.post("/register", registerLimiter, ctrl.register);

// Login
router.post("/login/password", loginIpLimiter, loginEmailLimiter, ctrl.loginPassword);
router.post("/login/google", googleLimiter, ctrl.loginGoogle);

// Password
router.post("/password/change", requireAuth(), changeLimiter, ctrl.changePassword);
router.post("/password/forgot", forgotIpLimiter, forgotEmailLimiter, ctrl.forgotPassword);
router.post("/password/reset", resetLimiter, ctrl.resetPassword);

// Logout
router.post("/logout", requireAuth(), ctrl.logout);

export default router;
