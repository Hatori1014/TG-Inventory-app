-- HU-15 — expand RequestStatus for the fuller purchase-request lifecycle
-- (DoR resolved with the user, diverges from the original 4-value enum:
-- draft -> pending -> in_review -> approved -> pending_inventory_integration
-- -> closed for purchase; pending -> approved/rejected -> closed for
-- consumption). Safe to recreate: "request"/"request_item" were
-- scaffolded in the initial migration but no endpoint has ever read or
-- written them.
ALTER TABLE "request" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "request" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;
DROP TYPE "RequestStatus";
CREATE TYPE "RequestStatus" AS ENUM ('draft', 'pending', 'in_review', 'approved', 'rejected', 'pending_inventory_integration', 'closed');
ALTER TABLE "request" ALTER COLUMN "status" TYPE "RequestStatus" USING "status"::"RequestStatus";
ALTER TABLE "request" ALTER COLUMN "status" SET DEFAULT 'pending';

-- HU-15, DoR resolved by the user: the requester picks the supplier when
-- creating a purchase request. Nullable — never set for type = consumption.
ALTER TABLE "request" ADD COLUMN "supplier_id" TEXT;
CREATE INDEX "request_supplier_id_idx" ON "request"("supplier_id");
ALTER TABLE "request" ADD CONSTRAINT "request_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
