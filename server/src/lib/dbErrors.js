export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FOREIGN_KEY_VIOLATION = "23503";
export const PG_INVALID_TEXT = "22P02";

// Drizzle wraps driver failures, leaving the Postgres error on `cause`.
export function pgErrorOf(err) {
    return err?.cause?.code ? err.cause : err;
}

export function isUniqueViolation(err, constraint) {
    const pgError = pgErrorOf(err);
    return (
        pgError?.code === PG_UNIQUE_VIOLATION &&
        (!constraint || pgError.constraint === constraint)
    );
}
