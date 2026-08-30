-- CreateTable
-- HU-31 — dedicated error log, separate from audit_event, recorded by
-- GlobalExceptionFilter for every error response (4xx and 5xx alike).
CREATE TABLE "error_event" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "module" TEXT,
    "action" TEXT,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status_code" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "error_event_module_action_idx" ON "error_event"("module", "action");

-- CreateIndex
CREATE INDEX "error_event_status_code_idx" ON "error_event"("status_code");

-- CreateIndex
CREATE INDEX "error_event_occurred_at_idx" ON "error_event"("occurred_at");

-- AddForeignKey
ALTER TABLE "error_event" ADD CONSTRAINT "error_event_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
