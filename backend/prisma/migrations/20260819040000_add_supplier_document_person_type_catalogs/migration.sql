-- CreateEnum
CREATE TYPE "DocumentTypeStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "PersonTypeStatus" AS ENUM ('active', 'inactive');

-- CreateTable
-- HU-04, at the user's explicit request: administrable catalog (TT-23
-- pattern) instead of a hardcoded enum. Seeded with a starter set
-- (Cédula de ciudadanía, Cédula de extranjería, NIT) by seed.ts.
CREATE TABLE "document_type" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "DocumentTypeStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "document_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
-- HU-04, at the user's explicit request: Natural/Jurídica as an
-- administrable catalog, same reasoning as document_type above.
CREATE TABLE "person_type" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "PersonTypeStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "person_type_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_type_name_key" ON "document_type"("name");

-- CreateIndex
CREATE UNIQUE INDEX "person_type_name_key" ON "person_type"("name");

-- AlterTable
ALTER TABLE "supplier" ADD COLUMN "document_type_id" TEXT,
ADD COLUMN "person_type_id" TEXT;

-- CreateIndex
CREATE INDEX "supplier_document_type_id_idx" ON "supplier"("document_type_id");

-- CreateIndex
CREATE INDEX "supplier_person_type_id_idx" ON "supplier"("person_type_id");

-- AddForeignKey
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "document_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_person_type_id_fkey" FOREIGN KEY ("person_type_id") REFERENCES "person_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
-- Partial unique index: HU-04 requires no duplicate tax ID among ACTIVE
-- suppliers of the SAME document type only — a Cédula and a NIT sharing
-- the same digits are two different real-world identifiers, not a
-- collision. An inactive supplier may share a (document type, tax ID)
-- pair with an active one (kept as a deactivated duplicate instead of
-- merged/deleted, per ADR-22). Prisma's schema DSL has no partial-index
-- syntax, so this exists only here, not mirrored as `@@unique` in
-- schema.prisma (see the comment on the Supplier model).
-- CreateSupplierUseCase/UpdateSupplierUseCase run an explicit
-- application-level check first; this index is the safety net for a race
-- between two concurrent requests. Gotcha (same one HU-06 already
-- documented for parentId): Postgres treats every NULL document_type_id
-- as distinct from every other NULL, so this index does NOT catch a race
-- between two concurrent requests that both omit documentTypeId — that
-- case relies on the application-level check alone. Acceptable: this
-- project is a single-admin-at-a-time system, not a case worth an
-- expression-index workaround.
CREATE UNIQUE INDEX "supplier_document_type_id_tax_id_active_key" ON "supplier"("document_type_id", "tax_id") WHERE "status" = 'active';
