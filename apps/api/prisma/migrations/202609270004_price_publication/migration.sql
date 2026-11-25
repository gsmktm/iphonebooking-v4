-- Existing observations remain private until a staff member supplies their context.
ALTER TABLE "PriceIntelligence"
  ADD COLUMN "variantId" TEXT,
  ADD COLUMN "countryCode" TEXT,
  ADD COLUMN "currency" TEXT,
  ADD COLUMN "priceKind" TEXT,
  ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PriceIntelligence" ADD CONSTRAINT "PriceIntelligence_publication_context_check"
  CHECK (NOT "published" OR (
    "productId" IS NOT NULL AND "variantId" IS NOT NULL
    AND "countryCode" ~ '^[A-Z]{2}$' AND "countryCode" IS NOT NULL
    AND "currency" ~ '^[A-Z]{3}$' AND "currency" IS NOT NULL
    AND "priceKind" IN ('OFFICIAL', 'STORE') AND "priceKind" IS NOT NULL
    AND "observedPrice" > 0 AND "observedPrice" IS NOT NULL
    AND "sourceUrl" ~ '^https?://' AND "sourceUrl" IS NOT NULL
    AND length(trim("source")) > 0
  ));

CREATE INDEX "PriceIntelligence_published_active_observedAt_idx"
  ON "PriceIntelligence"("published", "active", "observedAt");
CREATE INDEX "PriceIntelligence_productId_variantId_idx"
  ON "PriceIntelligence"("productId", "variantId");
