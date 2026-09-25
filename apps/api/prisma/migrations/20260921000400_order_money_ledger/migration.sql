CREATE TABLE "OrderMoneyEntry" (
 id TEXT NOT NULL PRIMARY KEY, "orderId" TEXT NOT NULL, "paymentId" TEXT,
 kind TEXT NOT NULL, amount INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'NPR',
 "eventKey" TEXT NOT NULL, source TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "OrderMoneyEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "OrderMoneyEntry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "OrderMoneyEntry_kind_check" CHECK ((kind = 'CHARGE' AND amount >= 0) OR (kind IN ('TRADE_IN_CREDIT', 'PAYMENT', 'VOID') AND amount <= 0)),
 CONSTRAINT "OrderMoneyEntry_currency_check" CHECK (currency = 'NPR')
);
CREATE UNIQUE INDEX "OrderMoneyEntry_eventKey_key" ON "OrderMoneyEntry"("eventKey");
CREATE INDEX "OrderMoneyEntry_orderId_createdAt_idx" ON "OrderMoneyEntry"("orderId", "createdAt");
-- Historical migration entries preserve known snapshots; no payment is invented.
INSERT INTO "OrderMoneyEntry" (id, "orderId", kind, amount, "eventKey", source, "createdAt")
 SELECT 'charge_' || o.id, o.id, 'CHARGE', COALESCE(SUM(i.quantity::bigint * i."unitPrice"), o.total)::integer, 'charge:' || o.id, 'HISTORICAL_BACKFILL', o."createdAt"
 FROM "Order" o LEFT JOIN "OrderItem" i ON i."orderId" = o.id GROUP BY o.id;
INSERT INTO "OrderMoneyEntry" (id, "orderId", kind, amount, "eventKey", source, "createdAt")
 SELECT 'credit_' || o.id, o.id, 'TRADE_IN_CREDIT', o.total - e.amount, 'trade-credit:' || o.id, 'HISTORICAL_BACKFILL', o."createdAt"
 FROM "Order" o JOIN "OrderMoneyEntry" e ON e."orderId" = o.id AND e.kind = 'CHARGE' WHERE e.amount > o.total;
INSERT INTO "OrderMoneyEntry" (id, "orderId", "paymentId", kind, amount, "eventKey", source, "createdAt")
 SELECT 'payment_' || id, "orderId", id, 'PAYMENT', -amount, 'payment:' || id, 'HISTORICAL_BACKFILL', "createdAt"
 FROM "Payment" WHERE status = 'CONFIRMED' AND amount > 0;
INSERT INTO "OrderMoneyEntry" (id, "orderId", kind, amount, "eventKey", source)
 SELECT 'void_' || o.id, o.id, 'VOID', -o.total, 'void:' || o.id, 'HISTORICAL_BACKFILL'
 FROM "Order" o WHERE o.status = 'EXPIRED' AND NOT EXISTS (SELECT 1 FROM "Payment" p WHERE p."orderId" = o.id AND p.status = 'CONFIRMED' AND p.amount > 0);
CREATE TRIGGER "OrderMoneyEntry_append_only" BEFORE UPDATE OR DELETE ON "OrderMoneyEntry" FOR EACH ROW EXECUTE FUNCTION reject_device_history_mutation();
