-- ADR-22 — Role is the first model to actually consume logical deletion:
-- a real "eliminar rol" action reassigns the role's users to the default
-- role and marks it deleted, instead of removing the row.
ALTER TABLE "role" ADD COLUMN "is_default" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "role" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- name is now unique only among non-deleted roles — a blanket @unique
-- would permanently block reusing a deleted role's name.
DROP INDEX "role_name_key";
CREATE UNIQUE INDEX "role_name_active_key" ON "role"("name") WHERE "deleted_at" IS NULL;

-- At most one role can ever be the default — enforced at the DB level,
-- not just in application code.
CREATE UNIQUE INDEX "role_is_default_key" ON "role"("is_default") WHERE "is_default" = true;
