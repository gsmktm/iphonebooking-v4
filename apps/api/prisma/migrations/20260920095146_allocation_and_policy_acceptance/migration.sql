-- CreateTable
CREATE TABLE "BookingAllocation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyAcceptance" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "policySlug" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "policySnapshot" JSONB NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingAllocation_unitId_key" ON "BookingAllocation"("unitId");

-- CreateIndex
CREATE INDEX "BookingAllocation_orderId_idx" ON "BookingAllocation"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyAcceptance_orderId_key" ON "PolicyAcceptance"("orderId");

-- AddForeignKey
ALTER TABLE "BookingAllocation" ADD CONSTRAINT "BookingAllocation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAllocation" ADD CONSTRAINT "BookingAllocation_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "InventoryUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAcceptance" ADD CONSTRAINT "PolicyAcceptance_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
