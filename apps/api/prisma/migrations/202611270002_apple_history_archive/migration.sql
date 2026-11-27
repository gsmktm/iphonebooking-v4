-- Apple historical device library, separate from retail inventory.
-- Seed file follows in the same migration directory.
CREATE TABLE "AppleHistoryDevice" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "family" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "introducedYear" INTEGER NOT NULL,
  "modelNumbers" TEXT,
  "capacity" TEXT,
  "chip" TEXT,
  "sourceUrl" TEXT NOT NULL,
  "referenceUrl" TEXT,
  "imageUrl" TEXT,
  "imageSourceUrl" TEXT,
  "imageCredit" TEXT,
  "imageLicense" TEXT,
  "imageLicenseUrl" TEXT,
  "checkedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppleHistoryDevice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AppleHistoryDevice_slug_key" ON "AppleHistoryDevice"("slug");
CREATE INDEX "AppleHistoryDevice_family_introducedYear_idx"
  ON "AppleHistoryDevice"("family", "introducedYear");
CREATE INDEX "AppleHistoryDevice_introducedYear_idx"
  ON "AppleHistoryDevice"("introducedYear");
ALTER TABLE "AppleHistoryDevice" ADD CONSTRAINT "AppleHistoryDevice_year_check"
  CHECK ("introducedYear" BETWEEN 1976 AND 2100);
ALTER TABLE "AppleHistoryDevice" ADD CONSTRAINT "AppleHistoryDevice_family_check"
  CHECK ("family" IN ('iphone','ipad','ipod','mac'));
