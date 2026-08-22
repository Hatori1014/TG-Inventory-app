-- HU-11 — minimum stock threshold is scoped per product, not per
-- product+location (DoR resolved with the user, diverges from the
-- original MER's design). Safe to alter: minimum_stock was scaffolded in
-- the initial migration but no endpoint has ever read or written it, so
-- there is no data to lose.
ALTER TABLE "minimum_stock" DROP CONSTRAINT "minimum_stock_location_id_fkey";
DROP INDEX "minimum_stock_product_id_location_id_key";
ALTER TABLE "minimum_stock" DROP COLUMN "location_id";
CREATE UNIQUE INDEX "minimum_stock_product_id_key" ON "minimum_stock"("product_id");
