-- Same result as unblocking everyone: restore contacts hidden by a block.
UPDATE "contacts" SET "status" = 'accepted' WHERE "status" = 'blocked';--> statement-breakpoint
DROP TABLE "blocked_users" CASCADE;
