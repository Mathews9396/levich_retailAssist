/*
  Warnings:

  - You are about to drop the `Product` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."ProductType" AS ENUM ('BISCUIT', 'SUGAR', 'SALT', 'NOODLES', 'BREAD', 'OIL', 'RICE', 'FLOUR', 'SPICE', 'DAIRY');

-- CreateEnum
CREATE TYPE "public"."ProductBrand" AS ENUM ('PARLE', 'TATA', 'MAGGI', 'BRITANNIA', 'FORTUNE', 'AASHIRVAAD', 'AMUL', 'EVEREST', 'PATANJALI', 'GENERIC');

-- CreateEnum
CREATE TYPE "public"."WeightUnit" AS ENUM ('GRAM', 'KILOGRAM', 'LITER', 'MILLILITER', 'PIECE');

-- DropForeignKey
ALTER TABLE "public"."InvoiceItem" DROP CONSTRAINT "InvoiceItem_sku_fkey";

-- DropForeignKey
ALTER TABLE "public"."Stock" DROP CONSTRAINT "Stock_sku_fkey";

-- DropTable
DROP TABLE "public"."Product";

-- CreateTable
CREATE TABLE "public"."products" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "productType" "public"."ProductType" NOT NULL,
    "brand" "public"."ProductBrand" NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "weightUnit" "public"."WeightUnit" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "public"."products"("sku");

-- AddForeignKey
ALTER TABLE "public"."Stock" ADD CONSTRAINT "Stock_sku_fkey" FOREIGN KEY ("sku") REFERENCES "public"."products"("sku") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoiceItem" ADD CONSTRAINT "InvoiceItem_sku_fkey" FOREIGN KEY ("sku") REFERENCES "public"."products"("sku") ON DELETE RESTRICT ON UPDATE CASCADE;
