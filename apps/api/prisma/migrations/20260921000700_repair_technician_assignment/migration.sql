-- Preserve legacy free text; only exact existing account IDs can be backfilled safely.
ALTER TABLE "Repair" ADD COLUMN "assignedTechnicianId" TEXT;
ALTER TABLE "Repair" ADD CONSTRAINT "Repair_assignedTechnicianId_fkey" FOREIGN KEY ("assignedTechnicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "RepairAssignment" (
 "id" TEXT NOT NULL,
 "repairId" TEXT NOT NULL,
 "technicianId" TEXT NOT NULL,
 "assignedById" TEXT,
 "reason" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "RepairAssignment_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "RepairAssignment_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES "Repair"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "RepairAssignment_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "RepairAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "RepairAssignment_repairId_createdAt_idx" ON "RepairAssignment"("repairId", "createdAt");
UPDATE "Repair" r SET "assignedTechnicianId" = u."id" FROM "User" u WHERE r."technician" = u."id";
INSERT INTO "RepairAssignment" ("id", "repairId", "technicianId", "reason")
 SELECT 'assignment-migration-' || "id", "id", "assignedTechnicianId", 'MIGRATION: matched legacy technician account ID; original assigning actor and date are unknown.'
 FROM "Repair" WHERE "assignedTechnicianId" IS NOT NULL;
CREATE TRIGGER "RepairAssignment_append_only" BEFORE UPDATE OR DELETE ON "RepairAssignment" FOR EACH ROW EXECUTE FUNCTION reject_device_history_mutation();
