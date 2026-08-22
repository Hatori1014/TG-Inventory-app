-- HU-17 — approve/reject a request. Drops Request.approverId/approver
-- (the original single-approver design): zero real rows ever used it (no
-- endpoint wrote or read it before this HU), and it can't represent
-- parallel multi-approval (the user's explicit requirement — any of
-- several approvers can cast one of the required votes) anyway.
ALTER TABLE "request" DROP CONSTRAINT "request_approver_id_fkey";
DROP INDEX "request_approver_id_idx";
ALTER TABLE "request" DROP COLUMN "approver_id";

-- TT-17/ADR-20 optimistic locking on Request — HU-17's parallel approvals
-- are the first writer here with a real concurrent-update race (two
-- approvers both reaching for the vote that completes quorum).
ALTER TABLE "request" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

-- Set once by IntegrateRequestUseCase when a purchase request's approved
-- items become a real Purchase (HU-13's RegisterPurchaseUseCase, reused).
-- UNIQUE doubles as a guard against integrating the same request twice.
ALTER TABLE "request" ADD COLUMN "purchase_id" TEXT;
CREATE UNIQUE INDEX "request_purchase_id_key" ON "request"("purchase_id");
ALTER TABLE "request" ADD CONSTRAINT "request_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- First real consumer of approval_flow (ADR-08's table, not redesigned):
-- how many distinct approvals a request of this type needs before it
-- resolves. Parametrizable per the user's explicit request.
ALTER TABLE "approval_flow" ADD COLUMN "required_approvals" INTEGER NOT NULL DEFAULT 2;

-- One row per approver who voted on a request — parallel multi-approval
-- (any of the required approvers can cast one of the needed votes) can't
-- be represented by a single approverId column, hence this table instead
-- of restoring the one just dropped above.
CREATE TYPE "RequestApprovalDecision" AS ENUM ('approved', 'rejected');

CREATE TABLE "request_approval" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "approver_id" TEXT NOT NULL,
    "decision" "RequestApprovalDecision" NOT NULL,
    "comment" TEXT,
    "decided_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_approval_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "request_approval_request_id_idx" ON "request_approval"("request_id");
-- Prevents the same approver voting twice on the same request — a second
-- real attempt is a 409 (AlreadyVotedError), not a second row.
CREATE UNIQUE INDEX "request_approval_request_id_approver_id_key" ON "request_approval"("request_id", "approver_id");

ALTER TABLE "request_approval" ADD CONSTRAINT "request_approval_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "request_approval" ADD CONSTRAINT "request_approval_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
