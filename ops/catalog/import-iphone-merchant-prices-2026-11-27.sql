-- iPhoneBooking V4 — merchant-supplied Nepal iPhone prices, 2026-11-27.
-- Target ONLY: the isolated Supabase database schema "iphonebooking".
-- Not a Prisma schema migration: apply manually to the approved preview database.
-- Idempotent, INSERT ONLY. Never overwrite earlier admin prices or stock.
-- Values are rupees in the source and are multiplied by 100 for the app's paise storage.
-- IMPORTANT: two secondary figures (iPhone 15, 17) are not labeled as former/list prices.
-- They are stored as unclassified quotes in Product.specs and NOT comparePrice.
-- Missing color, product photos and availability are not invented.
-- Do NOT create inventory stock, store, payment, order or prebooking records.
BEGIN;
SET LOCAL search_path TO iphonebooking, public;
INSERT INTO "Category" ("id", "slug", "name", "description", "image")
VALUES (
  'c' || substr(md5('iphonebooking:category:iphone'), 1, 24),
  'iphone', 'iPhone',
  'Apple iPhone device family. Local prices are supplied by the merchant and stock requires confirmation.',
  'phone'
)
ON CONFLICT ("slug") DO NOTHING;

WITH source ("slug", "name", "description", "officialUrl") AS (
  VALUES
  ('iphone-15', 'iPhone 15', '128GB price quoted for Nepal. Stock and finish to be confirmed.', 'https://www.apple.com/iphone-15/'),
  ('iphone-17', 'iPhone 17', '256GB price quoted for Nepal. Stock and finish to be confirmed.', 'https://www.apple.com/iphone-17/'),
  ('iphone-18-pro', 'iPhone 18 Pro', '256GB through 2TB price options supplied for Nepal. Stock and finish to be confirmed.', 'https://www.apple.com/iphone-18-pro/'),
  ('iphone-18-pro-max', 'iPhone 18 Pro Max', '256GB through 2TB price options supplied for Nepal. Stock and finish to be confirmed.', 'https://www.apple.com/iphone-18-pro/'),
  ('iphone-duo', 'iPhone Duo', 'Foldable iPhone with 256GB through 2TB quoted price options. Stock and finish to be confirmed.', 'https://www.apple.com/iphone-duo/specs/')
)
INSERT INTO "Product"
  ("id", "slug", "name", "tagline", "description", "categoryId", "image",
   "gallery", "specs", "badge", "active", "featured")
SELECT
  'c' || substr(md5('iphonebooking:product:' || src."slug"), 1, 24),
  src."slug", src."name",
  'Merchant-listed Nepal price. Availability to be confirmed.',
  src."description",
  (SELECT "id" FROM "Category" WHERE "slug" = 'iphone'),
  'phone',
  ARRAY[]::text[],
  jsonb_build_object(
    'Official source', src."officialUrl",
    'Price source', 'Merchant supplied 2026-11-27',
    'Availability', 'Not confirmed; no inventory published',
    'Finish', 'Not provided',
    'Secondary supplied figure',
      CASE src."slug"
        WHEN 'iphone-15' THEN 'NPR 148,299 — role not specified (not a compare-at price)'
        WHEN 'iphone-17' THEN 'NPR 188,499 — role not specified (not a compare-at price)'
        ELSE 'None'
      END
  ),
  CASE WHEN src."slug" IN ('iphone-18-pro', 'iphone-18-pro-max', 'iphone-duo')
    THEN 'New price list' ELSE 'Quoted price' END,
  true,
  false
FROM source AS src
ON CONFLICT ("slug") DO NOTHING;

WITH incoming ("slug", "storage", "rupees") AS (
  VALUES
  ('iphone-15', '128GB', 127499),
  ('iphone-17', '256GB', 173499),
  ('iphone-18-pro', '256GB', 259900),
  ('iphone-18-pro', '512GB', 301900),
  ('iphone-18-pro', '1TB', 386900),
  ('iphone-18-pro', '2TB', 513900),
  ('iphone-18-pro-max', '256GB', 279900),
  ('iphone-18-pro-max', '512GB', 322900),
  ('iphone-18-pro-max', '1TB', 407900),
  ('iphone-18-pro-max', '2TB', 534900),
  ('iphone-duo', '256GB', 430900),
  ('iphone-duo', '512GB', 472900),
  ('iphone-duo', '1TB', 557900),
  ('iphone-duo', '2TB', 684900)
)
INSERT INTO "ProductVariant"
  ("id", "productId", "sku", "color", "colorHex", "storage", "region",
   "price", "comparePrice", "deposit", "image", "preorder")
SELECT
  'c' || substr(md5('iphonebooking:variant:' || source."slug" || ':' || source."storage"), 1, 24),
  p."id",
  'IBP-' || upper(replace(source."slug", '-', '')) || '-' || upper(source."storage"),
  'Finish to confirm',
  '#9CA3AF',
  source."storage",
  'Not confirmed',
  source."rupees" * 100,
  NULL,
  0,
  NULL,
  false
FROM incoming AS source
INNER JOIN "Product" AS p ON p."slug" = source."slug"
ON CONFLICT ("sku") DO NOTHING;

-- Fail the entire import if any expected product or storage option is absent.
DO $check$
DECLARE product_count INTEGER;
DECLARE variant_count INTEGER;
BEGIN
  SELECT count(*) INTO product_count
    FROM "Product"
   WHERE "slug" IN ('iphone-15','iphone-17','iphone-18-pro','iphone-18-pro-max','iphone-duo');
  SELECT count(*) INTO variant_count
    FROM "ProductVariant" v
    JOIN "Product" p ON p."id" = v."productId"
   WHERE p."slug" IN ('iphone-15','iphone-17','iphone-18-pro','iphone-18-pro-max','iphone-duo');
  IF product_count <> 5 OR variant_count <> 14 THEN
    RAISE EXCEPTION 'Import coverage mismatch: products %, variants %', product_count, variant_count;
  END IF;
END $check$;
COMMIT;
SELECT 'PRICE_IMPORT_OK' AS result,
       count(DISTINCT p."id") AS products,
       count(v."id") AS variants,
       count(DISTINCT v."sku") AS unique_skus,
       min(v."price") AS min_paise,
       max(v."price") AS max_paise
FROM iphonebooking."Product" p
JOIN iphonebooking."ProductVariant" v ON v."productId" = p."id"
WHERE p."slug" IN ('iphone-15','iphone-17','iphone-18-pro','iphone-18-pro-max','iphone-duo');
