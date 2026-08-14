-- CreateIndex
CREATE INDEX "audit_event_user_id_idx" ON "audit_event"("user_id");

-- CreateIndex
CREATE INDEX "audit_event_entity_entity_id_idx" ON "audit_event"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "audit_event_occurred_at_idx" ON "audit_event"("occurred_at");

-- CreateIndex
CREATE INDEX "batch_product_id_idx" ON "batch"("product_id");

-- CreateIndex
CREATE INDEX "inventory_movement_product_id_location_id_idx" ON "inventory_movement"("product_id", "location_id");

-- CreateIndex
CREATE INDEX "inventory_movement_occurred_at_idx" ON "inventory_movement"("occurred_at");

-- CreateIndex
CREATE INDEX "inventory_movement_batch_id_idx" ON "inventory_movement"("batch_id");

-- CreateIndex
CREATE INDEX "inventory_movement_user_id_idx" ON "inventory_movement"("user_id");

-- CreateIndex
CREATE INDEX "inventory_movement_purchase_id_idx" ON "inventory_movement"("purchase_id");

-- CreateIndex
CREATE INDEX "inventory_movement_request_id_idx" ON "inventory_movement"("request_id");

-- CreateIndex
CREATE INDEX "location_parent_id_idx" ON "location"("parent_id");

-- CreateIndex
CREATE INDEX "location_stock_location_id_idx" ON "location_stock"("location_id");

-- CreateIndex
CREATE INDEX "purchase_supplier_id_purchased_at_idx" ON "purchase"("supplier_id", "purchased_at");

-- CreateIndex
CREATE INDEX "purchase_user_id_idx" ON "purchase"("user_id");

-- CreateIndex
CREATE INDEX "purchase_item_purchase_id_idx" ON "purchase_item"("purchase_id");

-- CreateIndex
CREATE INDEX "purchase_item_product_id_idx" ON "purchase_item"("product_id");

-- CreateIndex
CREATE INDEX "request_requester_id_idx" ON "request"("requester_id");

-- CreateIndex
CREATE INDEX "request_approver_id_idx" ON "request"("approver_id");

-- CreateIndex
CREATE INDEX "request_item_request_id_idx" ON "request_item"("request_id");

-- CreateIndex
CREATE INDEX "user_role_id_idx" ON "user"("role_id");
