/*
  Warnings:

  - You are about to drop the column `category` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `product` table. All the data in the column will be lost.
  - Added the required column `unit_id` to the `product` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CategoryStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "UnitStatus" AS ENUM ('active', 'inactive');

-- AlterTable
ALTER TABLE "product" DROP COLUMN "category",
DROP COLUMN "unit",
ADD COLUMN     "category_id" TEXT,
ADD COLUMN     "unit_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CategoryStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "UnitStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "unit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "category_name_key" ON "category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "unit_name_key" ON "unit"("name");

-- CreateIndex
CREATE INDEX "product_unit_id_idx" ON "product"("unit_id");

-- CreateIndex
CREATE INDEX "product_category_id_idx" ON "product"("category_id");

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
