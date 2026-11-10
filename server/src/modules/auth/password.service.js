import argon2 from "argon2";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";

import { env } from "../../config/env.js";
import { AppError } from "../../lib/AppError.js";
import { sendPasswordResetEmail } from "../../lib/email.js";
import { disconnectUserSockets } from "../../ws/connectionRegistry.js";
import * as repo from "./auth.repository.js";

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
