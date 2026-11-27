-- Media assets stored in private Railway object storage; metadata stays in Supabase.
-- Media URLs are public only when associated with public products/history entries.
CREATE TABLE "MediaAsset" (
  "id" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "sourceCredit" TEXT NOT NULL,
  "license" TEXT,
  "licenseUrl" TEXT,
  "altText" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MediaAsset_storageKey_key" ON "MediaAsset"("storageKey");
CREATE INDEX "MediaAsset_createdAt_idx" ON "MediaAsset"("createdAt");
CREATE INDEX "MediaAsset_uploadedById_idx" ON "MediaAsset"("uploadedById");
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_sourceType_check" CHECK ("sourceType" IN ('OWNED', 'LICENSED'));
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_mimeType_check" CHECK ("mimeType" IN ('image/jpeg', 'image/png', 'image/webp'));
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_byteSize_check" CHECK ("byteSize" > 0 AND "byteSize" <= 6291456);
ALTER TABLE "AppleHistoryDevice" ADD COLUMN "gallery" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
