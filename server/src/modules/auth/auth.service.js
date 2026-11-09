import argon2 from "argon2";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";

import { env } from "../../config/env.js";
import { AppError } from "../../lib/AppError.js";
import { isUniqueViolation } from "../../lib/dbErrors.js";
import { sendPasswordResetEmail } from "../../lib/email.js";
import { disconnectUserSockets } from "../../ws/connectionRegistry.js";
import * as repo from "./auth.repository.js";

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

function toAuthResult(user) {
    const { passwordHash, passwordResetNonce, sessionVersion, ...safe } = user;
    return { user: safe, sessionVersion };
}

// ── Registration ──

export async function register({ username, displayName, email, password }) {
    const existing = await repo.findUserByEmail(email);
    if (existing) {
        throw new AppError(409, "Email already registered", "EMAIL_TAKEN");
    }

    const passwordHash = await argon2.hash(password);

    try {
        const user = await repo.createUser({
            username,
            displayName,
            email,
            passwordHash,
        });
        return toAuthResult(user);
    } catch (err) {
        if (isUniqueViolation(err, "users_username_unique")) {
            throw new AppError(409, "Username already taken", "USERNAME_TAKEN");
        }
        // Lost a race with a concurrent registration for the same address.
        if (isUniqueViolation(err, "users_email_unique")) {
            throw new AppError(409, "Email already registered", "EMAIL_TAKEN");
        }
        throw err;
    }
}

// ── Password Login ──

export async function loginWithPassword({ email, password }) {
    const user = await repo.findUserByEmail(email);
    // Constant-time-ish: always verify even if user doesn't exist
    if (!user || !user.passwordHash) {
        await argon2.hash(password); // burn time to prevent timing oracle
        throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");
    }

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
        throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");
    }

    return toAuthResult(user);
}

// ── Google Login ──

export async function loginWithGoogle(idToken) {
    // verifyIdToken skips the audience check when given no audience, which
    // would accept a token Google issued for any other app.
    if (!env.GOOGLE_CLIENT_ID) {
        throw new AppError(
            503,
            "Google sign-in is not configured",
            "GOOGLE_AUTH_DISABLED",
        );
    }

    let payload;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: env.GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
    } catch (error) {
        throw new AppError(
            401,
            "Invalid Google ID token",
            "GOOGLE_AUTH_FAILED",
        );
    }

    if (!payload?.email || payload.email_verified !== true) {
        throw new AppError(
            401,
            "Google account email is not verified",
            "GOOGLE_AUTH_FAILED",
        );
    }

    const email = payload.email.toLowerCase();
    let user = await repo.findUserByEmail(email);

    if (user && !user.emailVerifiedAt) {
        // Google has just proven ownership of an address nobody had verified.
        // Whoever set a password on this account may not be the owner, so the
        // password and any sessions it opened do not survive this login.
        const hadPassword = !!user.passwordHash;
        user = await repo.updateUser(user.id, {
            emailVerifiedAt: new Date(),
            passwordHash: null,
            passwordResetNonce: null,
            ...(hadPassword && { sessionVersion: repo.nextSessionVersion }),
        });
        if (hadPassword) disconnectUserSockets(user.id);
    }

    if (!user) {
        // Auto-register the user if they don't exist
        // Leaves room in the 30-character column for a numeric suffix.
        const baseUsername =
            email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 24) || "user";
        let username = baseUsername;
        let counter = 1;
        // Basic unique username generation
        while (true) {
            try {
                user = await repo.createUser({
                    username,
                    displayName: payload.name || baseUsername,
                    email,
                    avatarUrl: payload.picture,
                    emailVerifiedAt: new Date(),
                });
                break;
            } catch (e) {
                // If unique constraint failed on username, try another
                if (isUniqueViolation(e, "users_username_unique")) {
                    username = `${baseUsername}${counter++}`;
                } else {
                    throw e;
                }
            }
        }
    }

    return toAuthResult(user);
}

// ── Password Change ──

// Revokes every other session; returns the version the caller's session must
// adopt to stay signed in.
export async function changePassword(userId, currentPassword, newPassword) {
    const user = await repo.findUserById(userId);

    if (user.passwordHash) {
        const valid = await argon2.verify(user.passwordHash, currentPassword);
        if (!valid) {
            throw new AppError(
                400,
                "Current password is incorrect",
                "INVALID_PASSWORD",
            );
        }
    }

    const newHash = await argon2.hash(newPassword);
    const updated = await repo.updateUser(userId, {
        passwordHash: newHash,
        sessionVersion: repo.nextSessionVersion,
    });
    return updated.sessionVersion;
}

// ── Forgot Password ──

export async function forgotPassword(email) {
    const user = await repo.findUserByEmail(email);
    // Don't reveal whether the email exists
    if (!user) return;

    const nonce = crypto.randomUUID();
    await repo.updateUser(user.id, { passwordResetNonce: nonce });

    const resetToken = jwt.sign(
        { purpose: "password_reset", userId: user.id, nonce },
        env.JWT_SECRET,
        { expiresIn: "15m" },
    );

    const resetLink = `${env.CORS_ORIGIN}/reset-password?token=${resetToken}`;

    // Not awaited: a slow or failing send must not make known addresses
    // distinguishable from unknown ones.
    sendPasswordResetEmail(user.email, resetLink).catch((err) => {
        console.error("[EMAIL] Failed to send password reset:", err.message);
    });
}

export async function resetPassword(resetToken, newPassword) {
    let payload;
    try {
        payload = jwt.verify(resetToken, env.JWT_SECRET);
    } catch {
        throw new AppError(
            400,
            "Invalid or expired reset token",
            "RESET_TOKEN_INVALID",
        );
    }

    if (payload.purpose !== "password_reset") {
        throw new AppError(400, "Invalid token purpose", "RESET_TOKEN_INVALID");
    }

    const user = await repo.findUserById(payload.userId);
    if (!user || user.passwordResetNonce !== payload.nonce) {
        throw new AppError(
            400,
            "Reset token already used or invalid",
            "RESET_TOKEN_INVALID",
        );
    }

    const newHash = await argon2.hash(newPassword);
    await repo.updateUser(user.id, {
        passwordHash: newHash,
        passwordResetNonce: null,
        // Following the emailed link proves ownership of the address.
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        sessionVersion: repo.nextSessionVersion,
    });
    disconnectUserSockets(user.id);
}
