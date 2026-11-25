-- Preserve existing store receipts; provider evidence is added, never fabricated.
ALTER TABLE "Order" ADD COLUMN "requestHash" TEXT;
ALTER TABLE "Payment"
  ADD COLUMN "transactionId" TEXT,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'NPR',
  ADD COLUMN "checkoutUrl" TEXT,
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "verifiedAt" TIMESTAMP(3),
  ADD COLUMN "failureCode" TEXT;
CREATE UNIQUE INDEX "Payment_transactionId_key" ON "Payment" ("transactionId");
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment" ("idempotencyKey");
CREATE UNIQUE INDEX "Payment_one_active_khalti_per_order"
  ON "Payment" ("orderId")
  WHERE provider = 'KHALTI' AND status IN ('INITIALIZING', 'INITIALIZATION_UNCERTAIN', 'PENDING', 'VERIFICATION_PENDING', 'REVIEW_REQUIRED');
ALTER TABLE "Payment" ADD CONSTRAINT "payment_currency_valid" CHECK ("currency" = 'NPR');
