-- DropForeignKey
ALTER TABLE "public"."stocks" DROP CONSTRAINT "stocks_id_fkey";

-- AddForeignKey
ALTER TABLE "public"."stocks" ADD CONSTRAINT "stocks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
