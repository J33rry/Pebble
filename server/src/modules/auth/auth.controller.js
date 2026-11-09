import { asyncHandler } from "../../lib/asyncHandler.js";
import { disconnectUserSockets } from "../../ws/connectionRegistry.js";
import * as authService from "./auth.service.js";
import * as v from "./auth.validation.js";

const regenerateSession = (req) =>
    new Promise((resolve, reject) =>
        req.session.regenerate((err) => (err ? reject(err) : resolve())),
    );

const saveSession = (req) =>
    new Promise((resolve, reject) =>
        req.session.save((err) => (err ? reject(err) : resolve())),
    );

// Regenerate to prevent session fixation, then explicitly save so the session
// is written to the store before the response and cookie are sent; otherwise a
// later reload could see no userId.
async function startSession(req, { user, sessionVersion }) {
    await regenerateSession(req);
    req.session.userId = user.id;
    req.session.sessionVersion = sessionVersion;
    await saveSession(req);
}

export const register = asyncHandler(async (req, res) => {
    const body = v.registerSchema.parse(req.body);
    const result = await authService.register(body);
    await startSession(req, result);
    res.status(201).json({ user: result.user });
});

// ── Login flow ──

export const loginPassword = asyncHandler(async (req, res) => {
    const body = v.loginPasswordSchema.parse(req.body);
    const result = await authService.loginWithPassword(body);
    await startSession(req, result);
    res.json({ user: result.user });
});

export const loginGoogle = asyncHandler(async (req, res) => {
    const { idToken } = v.loginGoogleSchema.parse(req.body);
    const result = await authService.loginWithGoogle(idToken);
    await startSession(req, result);
    res.json({ user: result.user });
});

// ── Password change ──

export const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = v.passwordChangeSchema.parse(req.body);
    const sessionVersion = await authService.changePassword(
        req.user.id,
        currentPassword,
        newPassword,
    );

    // Every other device is signed out; this one stays signed in.
    req.session.sessionVersion = sessionVersion;
    await saveSession(req);
    disconnectUserSockets(req.user.id, { exceptSessionId: req.sessionID });

    res.json({ message: "Password changed" });
});

// ── Forgot / reset password ──

export const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = v.forgotPasswordSchema.parse(req.body);
    await authService.forgotPassword(email);
    // Always 200 to prevent email enumeration
    res.json({ message: "If that email exists, a reset link has been sent" });
});

export const resetPassword = asyncHandler(async (req, res) => {
    const { resetToken, newPassword } = v.resetPasswordSchema.parse(req.body);
    await authService.resetPassword(resetToken, newPassword);
    res.json({ message: "Password reset successful" });
});

// ── Logout ──

export const logout = asyncHandler(async (req, res, next) => {
    req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out" });
    });
});
