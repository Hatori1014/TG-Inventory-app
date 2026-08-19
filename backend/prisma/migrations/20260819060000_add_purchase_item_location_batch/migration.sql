-- AlterTable
-- HU-13, at the user's explicit request: destination location chosen per
-- purchase item (not once for the whole purchase), and an optional batch —
-- both flow through to the InventoryMovement each item generates.
ALTER TABLE "purchase_item" ADD COLUMN "location_id" TEXT NOT NULL,
ADD COLUMN "batch_id" TEXT;

-- CreateIndex
CREATE INDEX "purchase_item_location_id_idx" ON "purchase_item"("location_id");

-- CreateIndex
CREATE INDEX "purchase_item_batch_id_idx" ON "purchase_item"("batch_id");

-- AddForeignKey
ALTER TABLE "purchase_item" ADD CONSTRAINT "purchase_item_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_item" ADD CONSTRAINT "purchase_item_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
