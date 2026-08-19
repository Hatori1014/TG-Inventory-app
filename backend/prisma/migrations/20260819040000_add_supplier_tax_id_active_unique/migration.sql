-- CreateIndex
-- Partial unique index: HU-04 requires no duplicate tax ID among ACTIVE
-- suppliers only — an inactive supplier may share a tax ID with an active
-- one (kept as a deactivated duplicate instead of merged/deleted, per
-- ADR-22). Prisma's schema DSL has no partial-index syntax, so this exists
-- only here, not mirrored as `@@unique` in schema.prisma (see the comment
-- on the Supplier model). CreateSupplierUseCase/UpdateSupplierUseCase run
-- an explicit application-level check first; this index is the safety net
-- for a race between two concurrent requests.
CREATE UNIQUE INDEX "supplier_tax_id_active_key" ON "supplier"("tax_id") WHERE "status" = 'active';
