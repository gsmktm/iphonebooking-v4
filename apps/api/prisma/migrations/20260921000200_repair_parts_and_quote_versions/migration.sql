CREATE TABLE "PartMovement" (
 "id" TEXT NOT NULL PRIMARY KEY, "partId" TEXT NOT NULL, "repairId" TEXT,
 "type" TEXT NOT NULL, "quantity" INTEGER NOT NULL, "unitCost" INTEGER NOT NULL,
 "reference" TEXT NOT NULL, "actorId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "PartMovement_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "PartMovement_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES "Repair"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "PartMovement_cost_check" CHECK ("unitCost" >= 0),
 CONSTRAINT "PartMovement_direction_check" CHECK (("type" = 'RECEIPT' AND "quantity" > 0) OR ("type" = 'CONSUMED' AND "quantity" < 0))
);
CREATE UNIQUE INDEX "PartMovement_reference_key" ON "PartMovement"("reference");
CREATE INDEX "PartMovement_partId_createdAt_idx" ON "PartMovement"("partId", "createdAt");
ALTER TABLE "Part" ADD CONSTRAINT "Part_stock_check" CHECK (stock >= 0), ADD CONSTRAINT "Part_cost_check" CHECK (cost IS NULL OR cost >= 0);
CREATE UNIQUE INDEX "TradeInQuote_tradeInId_version_key" ON "TradeInQuote"("tradeInId", "version");
CREATE TRIGGER "PartMovement_append_only" BEFORE UPDATE OR DELETE ON "PartMovement" FOR EACH ROW EXECUTE FUNCTION reject_device_history_mutation();
