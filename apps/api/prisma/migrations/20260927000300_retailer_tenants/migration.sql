-- Retailer access is explicit. Existing retailers and stores receive no implicit members.
ALTER TABLE "Store" ADD COLUMN "retailerId" TEXT;
ALTER TABLE "Store" ADD COLUMN "retailerAssignedAt" TIMESTAMP(3);
CREATE INDEX "Store_retailerId_idx" ON "Store"("retailerId");
ALTER TABLE "Store" ADD CONSTRAINT "Store_retailerId_fkey"
  FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Store" ADD CONSTRAINT "Store_retailer_assignment_complete"
  CHECK (("retailerId" IS NULL) = ("retailerAssignedAt" IS NULL));

CREATE TABLE "RetailerMember" (
  "id" TEXT NOT NULL,
  "retailerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'VIEWER',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RetailerMember_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RetailerMember_role_check" CHECK ("role" IN ('OWNER', 'MANAGER', 'VIEWER'))
);
CREATE UNIQUE INDEX "RetailerMember_retailerId_userId_key" ON "RetailerMember"("retailerId", "userId");
CREATE INDEX "RetailerMember_userId_active_idx" ON "RetailerMember"("userId", "active");
ALTER TABLE "RetailerMember" ADD CONSTRAINT "RetailerMember_retailerId_fkey"
  FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RetailerMember" ADD CONSTRAINT "RetailerMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "RetailerApplication" (
  "id" TEXT NOT NULL,
  "applicantId" TEXT NOT NULL,
  "businessName" TEXT NOT NULL,
  "contactName" TEXT NOT NULL,
  "contactPhone" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewNote" TEXT,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "retailerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RetailerApplication_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RetailerApplication_status_check" CHECK ("status" IN ('PENDING', 'APPROVED', 'REJECTED')),
  CONSTRAINT "RetailerApplication_review_check" CHECK (
    ("status" = 'PENDING' AND "reviewedAt" IS NULL AND "reviewedBy" IS NULL AND "retailerId" IS NULL)
    OR ("status" = 'APPROVED' AND "reviewedAt" IS NOT NULL AND "reviewedBy" IS NOT NULL AND "retailerId" IS NOT NULL)
    OR ("status" = 'REJECTED' AND "reviewedAt" IS NOT NULL AND "reviewedBy" IS NOT NULL AND "retailerId" IS NULL)
  )
);
CREATE UNIQUE INDEX "RetailerApplication_applicantId_key" ON "RetailerApplication"("applicantId");
CREATE UNIQUE INDEX "RetailerApplication_retailerId_key" ON "RetailerApplication"("retailerId");
CREATE INDEX "RetailerApplication_status_createdAt_idx" ON "RetailerApplication"("status", "createdAt");
ALTER TABLE "RetailerApplication" ADD CONSTRAINT "RetailerApplication_applicantId_fkey"
  FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RetailerApplication" ADD CONSTRAINT "RetailerApplication_retailerId_fkey"
  FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A mapped store cannot silently carry its order history to another tenant.
-- An ownership transfer requires a separately reviewed migration/workflow.
CREATE FUNCTION protect_store_retailer_assignment() RETURNS trigger AS $$
BEGIN
  IF OLD."retailerId" IS NOT NULL AND (
    NEW."retailerId" IS DISTINCT FROM OLD."retailerId" OR
    NEW."retailerAssignedAt" IS DISTINCT FROM OLD."retailerAssignedAt"
  ) THEN
    RAISE EXCEPTION 'A retailer store assignment is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "Store_protect_retailer_assignment"
  BEFORE UPDATE ON "Store" FOR EACH ROW EXECUTE FUNCTION protect_store_retailer_assignment();
