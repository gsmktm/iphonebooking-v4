ALTER TABLE "PurchaseOrder" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "InventoryUnit" ADD COLUMN "grnId" TEXT, ADD COLUMN cost INTEGER;
ALTER TABLE "InventoryUnit" ADD CONSTRAINT "InventoryUnit_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "GoodsReceivedNote"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryUnit" ADD CONSTRAINT "InventoryUnit_cost_check" CHECK (cost IS NULL OR cost >= 0);
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_quantity_check" CHECK ("orderedQty" > 0 AND "receivedQty" >= 0 AND "pendingQty" >= 0 AND "receivedQty" + "pendingQty" = "orderedQty");
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_money_check" CHECK ("costNPR" >= 0 AND "taxNPR" >= 0 AND "freightNPR" >= 0);
