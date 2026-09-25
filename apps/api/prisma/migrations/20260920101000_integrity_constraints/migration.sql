-- Additive protections; fail rather than silently repair invalid transactional data.
ALTER TABLE "InventoryStock" ADD CONSTRAINT "inventory_available_nonnegative" CHECK ("available" >= 0);
ALTER TABLE "InventoryStock" ADD CONSTRAINT "inventory_reserved_nonnegative" CHECK ("reserved" >= 0);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "variant_price_valid" CHECK ("price" > 0 AND "deposit" >= 0 AND "deposit" <= "price");
ALTER TABLE "Order" ADD CONSTRAINT "order_totals_valid" CHECK ("total" >= 0 AND "dueNow" >= 0 AND "dueNow" <= "total");
ALTER TABLE "OrderItem" ADD CONSTRAINT "order_item_quantity_valid" CHECK ("quantity" > 0 AND "unitPrice" > 0);
ALTER TABLE "Payment" ADD CONSTRAINT "payment_amount_valid" CHECK ("amount" >= 0);
ALTER TABLE "RepairQuote" ADD CONSTRAINT "repair_quote_total_valid" CHECK ("parts" >= 0 AND "labor" >= 0 AND "total" = "parts" + "labor");
CREATE INDEX "Order_userId_createdAt_idx" ON "Order" ("userId", "createdAt");
CREATE INDEX "Order_status_expiresAt_idx" ON "Order" ("status", "expiresAt");
CREATE INDEX "Repair_userId_createdAt_idx" ON "Repair" ("userId", "createdAt");
CREATE INDEX "TradeIn_userId_createdAt_idx" ON "TradeIn" ("userId", "createdAt");
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog" ("entity", "entityId");
