-- One-time repair for the merchant MacBook import of 2026-11-27.
-- Product.specs is displayed as Record<string,string> in React, so a nested JSON
-- object of secondary price quotes caused category and detail pages to crash.
-- Change ONLY that import-created spec property. Prices, stock and checkout stay unchanged.
BEGIN;
SET LOCAL search_path TO iphonebooking, public;

UPDATE "Product" p
SET "specs" = jsonb_set(
  p."specs",
  '{Secondary supplied figures}',
  to_jsonb(
    COALESCE(
      (
        SELECT string_agg(
          entry.key || ': ' || entry.value,
          '; ' ORDER BY entry.key
        )
        FROM jsonb_each_text(
          p."specs" -> 'Secondary supplied figures'
        ) AS entry(key, value)
      ),
      'None'
    )
  ),
  true
)
WHERE p."slug" IN (
  'macbook-neo-a18-pro-13', 'macbook-air-m5-13', 'macbook-air-m5-15',
  'macbook-pro-m5-14', 'macbook-pro-m5-pro-14', 'macbook-pro-m5-max-14',
  'macbook-pro-m5-pro-16', 'macbook-pro-m5-max-16'
)
AND jsonb_typeof(p."specs" -> 'Secondary supplied figures') = 'object';

DO $check$
DECLARE correct_products integer;
DECLARE correct_variants integer;
BEGIN
  SELECT count(*) INTO correct_products FROM "Product"
  WHERE "slug" IN (
    'macbook-neo-a18-pro-13', 'macbook-air-m5-13', 'macbook-air-m5-15',
    'macbook-pro-m5-14', 'macbook-pro-m5-pro-14', 'macbook-pro-m5-max-14',
    'macbook-pro-m5-pro-16', 'macbook-pro-m5-max-16'
  )
  AND jsonb_typeof("specs" -> 'Secondary supplied figures') = 'string';
  SELECT count(*) INTO correct_variants
  FROM "ProductVariant" v
  JOIN "Product" p ON p."id" = v."productId"
  WHERE p."slug" IN (
    'macbook-neo-a18-pro-13', 'macbook-air-m5-13', 'macbook-air-m5-15',
    'macbook-pro-m5-14', 'macbook-pro-m5-pro-14', 'macbook-pro-m5-max-14',
    'macbook-pro-m5-pro-16', 'macbook-pro-m5-max-16'
  );
  IF correct_products <> 8 OR correct_variants <> 17 THEN
    RAISE EXCEPTION 'MacBook spec normalization mismatch: products %, variants %',
      correct_products, correct_variants;
  END IF;
END $check$;
COMMIT;

SELECT 'MACBOOK_SPEC_TEXT_OK' AS result,
  count(*) AS affected_products
FROM iphonebooking."Product"
WHERE "slug" IN (
  'macbook-neo-a18-pro-13', 'macbook-air-m5-13', 'macbook-air-m5-15',
  'macbook-pro-m5-14', 'macbook-pro-m5-pro-14', 'macbook-pro-m5-max-14',
  'macbook-pro-m5-pro-16', 'macbook-pro-m5-max-16'
)
AND jsonb_typeof("specs" -> 'Secondary supplied figures') = 'string';
