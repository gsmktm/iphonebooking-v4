-- Prevent simultaneous staff requests from issuing duplicate pending quotes.
CREATE UNIQUE INDEX "RepairQuote_one_pending_per_repair" ON "RepairQuote" ("repairId") WHERE "status" = 'PENDING';
-- Current refund workflow requests the full payment once. Partial refund support needs a reviewed migration.
CREATE UNIQUE INDEX "Refund_one_request_per_payment" ON "Refund" ("paymentId");
