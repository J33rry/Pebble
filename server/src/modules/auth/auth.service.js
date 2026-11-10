import argon2 from "argon2";

import { AppError } from "../../lib/AppError.js";
import { isUniqueViolation } from "../../lib/dbErrors.js";
import * as repo from "./auth.repository.js";

export function toAuthResult(user) {
    const { passwordHash, passwordResetNonce, sessionVersion, ...safe } = user;
    return { user: safe, sessionVersion };
}

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

// ── Forgot Password ──
