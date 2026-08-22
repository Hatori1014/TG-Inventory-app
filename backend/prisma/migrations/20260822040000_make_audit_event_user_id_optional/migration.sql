-- AlterTable
-- HU-23: a failed login against an email that matches no user has no real
-- userId to attach to its AuditEvent row (the attempted email is stored in
-- entityId instead). The existing FK constraint still applies to non-null
-- values, so this alone is enough — no constraint needs dropping/recreating.
ALTER TABLE "audit_event" ALTER COLUMN "user_id" DROP NOT NULL;
