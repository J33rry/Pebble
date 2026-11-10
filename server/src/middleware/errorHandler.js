import { ZodError } from "zod";
import { AppError } from "../lib/AppError.js";
import {
    pgErrorOf,
    PG_FOREIGN_KEY_VIOLATION,
    PG_INVALID_TEXT,
    PG_UNIQUE_VIOLATION,
} from "../lib/dbErrors.js";

// Database failures a client can cause with bad input. Anything else is ours.
const CLIENT_DB_ERRORS = {
    [PG_UNIQUE_VIOLATION]: [409, "CONFLICT", "That already exists"],
    [PG_FOREIGN_KEY_VIOLATION]: [400, "INVALID_REFERENCE", "Referenced record does not exist"],
    [PG_INVALID_TEXT]: [400, "INVALID_ID", "Invalid identifier"],
};

// Hook point: add Sentry.captureException, Datadog, structured logger, etc.
export function errorHandler(err, _req, res, _next) {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: { code: err.code, message: err.message },
        });
    }

    if (err instanceof ZodError) {
        return res.status(422).json({
            error: {
                code: "VALIDATION_ERROR",
                message: "Invalid input",
                details: err.issues.map((e) => ({
                    path: e.path.join("."),
                    message: e.message,
                })),
            },
        });
    }

    const dbError = CLIENT_DB_ERRORS[pgErrorOf(err)?.code];
    if (dbError) {
        const [status, code, message] = dbError;
        return res.status(status).json({ error: { code, message } });
    }

    // Malformed or oversized request bodies, raised by express.json().
    if (err.expose && err.status >= 400 && err.status < 500) {
        return res.status(err.status).json({
            error: { code: "BAD_REQUEST", message: "Invalid request" },
        });
    }

    console.error("[UNHANDLED ERROR]", err);
    res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
    });
}
