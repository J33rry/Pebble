import { OAuth2Client } from "google-auth-library";

import { env } from "../../config/env.js";
import { AppError } from "../../lib/AppError.js";
import { isUniqueViolation } from "../../lib/dbErrors.js";
import { disconnectUserSockets } from "../../ws/connectionRegistry.js";
import { toAuthResult } from "./auth.service.js";
import * as repo from "./auth.repository.js";

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

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
