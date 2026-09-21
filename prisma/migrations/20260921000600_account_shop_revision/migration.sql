ALTER TABLE "User" ADD COLUMN "shopRevision" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD CONSTRAINT "User_shopRevision_check" CHECK ("shopRevision" >= 0);
