-- iPhoneBooking V4 / merchant supplied MacBook prices / 2026-11-27
-- Applies ONLY to the isolated Supabase schema iphonebooking; not a Prisma migration.
-- These are user-submitted NPR quotes, not Apple's retail prices or verified stock.
-- Amounts use integer paise (NPR * 100); no invented finish, stock, deposit, or photos.
-- The four unlabeled second price figures are notes, not comparePrice/discounts.
-- Rerunnable insert-only script; on existing conflicting prices it aborts instead
-- of overwriting a previously approved or administratively edited product price.
BEGIN;
SET LOCAL search_path TO iphonebooking, public;

CREATE TEMP TABLE _macbook_price_import (
  "slug" text NOT NULL,
  "config" text NOT NULL,
  "firstNpr" integer NOT NULL CHECK ("firstNpr" > 0),
  "secondaryNpr" integer,
  PRIMARY KEY ("slug", "config")
) ON COMMIT DROP;

INSERT INTO _macbook_price_import ("slug","config","firstNpr","secondaryNpr") VALUES
  ('macbook-neo-a18-pro-13', '8GB RAM / 256GB SSD', '135000', NULL),
  ('macbook-neo-a18-pro-13', '8GB RAM / 512GB SSD', '154000', NULL),
  ('macbook-air-m5-13', '16GB RAM / 512GB SSD', '248500', '234900'),
  ('macbook-air-m5-13', '16GB RAM / 1TB SSD', '305000', '289900'),
  ('macbook-air-m5-13', '24GB RAM / 1TB SSD', '342500', NULL),
  ('macbook-air-m5-15', '16GB RAM / 512GB SSD', '286000', '269900'),
  ('macbook-air-m5-15', '16GB RAM / 1TB SSD', '342500', '329900'),
  ('macbook-air-m5-15', '24GB RAM / 1TB SSD', '380500', NULL),
  ('macbook-pro-m5-14', '16GB RAM / 1TB SSD', '376500', NULL),
  ('macbook-pro-m5-14', '24GB RAM / 1TB SSD', '415000', NULL),
  ('macbook-pro-m5-14', '32GB RAM / 1TB SSD', '456000', NULL),
  ('macbook-pro-m5-pro-14', '24GB RAM / 1TB SSD', '474500', NULL),
  ('macbook-pro-m5-pro-14', '24GB RAM / 2TB SSD', '569000', NULL),
  ('macbook-pro-m5-max-14', '36GB RAM / 2TB SSD', '776500', NULL),
  ('macbook-pro-m5-pro-16', '48GB RAM / 1TB SSD', '677000', NULL),
  ('macbook-pro-m5-max-16', '36GB RAM / 2TB SSD', '833000', NULL),
  ('macbook-pro-m5-max-16', '48GB RAM / 2TB SSD', '946000', NULL);

INSERT INTO "Category" ("id","slug","name","description","image")
VALUES (
 'c' || substr(md5('iphonebooking:category:mac'),1,24),
 'mac',
 'Mac',
 'MacBook family with Nepal prices submitted by the merchant. Check exact configurations and confirm availability.',
 'mac'
)
ON CONFLICT ("slug") DO NOTHING;

WITH source ("slug","name","chip","screen","officialUrl") AS (
 VALUES
  ('macbook-neo-a18-pro-13', 'MacBook Neo A18 Pro 13-inch', 'A18 Pro', '13-inch', 'https://www.apple.com/macbook-neo/specs/'),
  ('macbook-air-m5-13', 'MacBook Air M5 13-inch', 'M5', '13-inch', 'https://www.apple.com/macbook-air/specs/'),
  ('macbook-air-m5-15', 'MacBook Air M5 15-inch', 'M5', '15-inch', 'https://www.apple.com/macbook-air/specs/'),
  ('macbook-pro-m5-14', 'MacBook Pro M5 14-inch', 'M5', '14-inch', 'https://www.apple.com/macbook-pro/specs/'),
  ('macbook-pro-m5-pro-14', 'MacBook Pro M5 Pro 14-inch', 'M5 Pro', '14-inch', 'https://www.apple.com/macbook-pro/specs/'),
  ('macbook-pro-m5-max-14', 'MacBook Pro M5 Max 14-inch', 'M5 Max', '14-inch', 'https://www.apple.com/macbook-pro/specs/'),
  ('macbook-pro-m5-pro-16', 'MacBook Pro M5 Pro 16-inch', 'M5 Pro', '16-inch', 'https://www.apple.com/macbook-pro/specs/'),
  ('macbook-pro-m5-max-16', 'MacBook Pro M5 Max 16-inch', 'M5 Max', '16-inch', 'https://www.apple.com/macbook-pro/specs/')
)
INSERT INTO "Product"
 ("id","slug","name","tagline","description","categoryId","image",
  "gallery","specs","badge","active","featured")
SELECT
  'c' || substr(md5('iphonebooking:product:' || source."slug"),1,24),
  source."slug",
  source."name",
  'Merchant-quoted Nepal price. Stock and finish to be confirmed.',
  source."name" || ' — choose a RAM / SSD configuration; availability, colour and warranty must be confirmed before purchase.',
  (SELECT "id" FROM "Category" WHERE "slug"='mac'),
  'mac',
  ARRAY[]::text[],
  jsonb_build_object(
    'Chip',source."chip",
    'Screen',source."screen",
    'Official reference',source."officialUrl",
    'Price source','Merchant supplied 2026-11-27 (first numeric figure)',
    'Availability','Not confirmed; no inventory published',
    'Finish','Not provided',
    'Secondary supplied figures',
      COALESCE((
        SELECT jsonb_object_agg(
          v."config",
          'NPR ' || to_char(v."secondaryNpr",'FM999,999,999') ||
          ' — type unspecified; not used as compare-at price'
        )
        FROM _macbook_price_import v
        WHERE v."slug"=source."slug" AND v."secondaryNpr" IS NOT NULL
      ), '{}'::jsonb)
  ),
  'Merchant quote',
  true,
  false
FROM source
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "ProductVariant"
 ("id","productId","sku","color","colorHex","storage","region",
 "price","comparePrice","deposit","image","preorder")
SELECT
 'c' || substr(md5('iphonebooking:variant:' || data."slug" || ':' || data."config"),1,24),
 p."id",
 'IBP-' || upper(replace(data."slug",'-','')) || '-' ||
    upper(replace(replace(data."config",' / ','-'),' ','')),
 'Finish to confirm',
 '#9CA3AF',
 data."config",
 'Not confirmed',
 data."firstNpr" * 100,
 NULL,
 0,
 NULL,
 false
FROM _macbook_price_import data
JOIN "Product" p ON p."slug"=data."slug"
ON CONFLICT ("sku") DO NOTHING;

-- Fail/rollback on duplicates, absent configurations or different established prices.
DO $verify$
DECLARE p_count integer;
DECLARE v_count integer;
DECLARE matched_count integer;
BEGIN
 SELECT count(*) INTO p_count FROM "Product" WHERE "slug" IN
   ('macbook-neo-a18-pro-13','macbook-air-m5-13','macbook-air-m5-15',
    'macbook-pro-m5-14','macbook-pro-m5-pro-14','macbook-pro-m5-max-14',
    'macbook-pro-m5-pro-16','macbook-pro-m5-max-16');
 SELECT count(*) INTO v_count FROM "ProductVariant" v
 JOIN "Product" p ON p."id"=v."productId"
 WHERE p."slug" IN
   ('macbook-neo-a18-pro-13','macbook-air-m5-13','macbook-air-m5-15',
    'macbook-pro-m5-14','macbook-pro-m5-pro-14','macbook-pro-m5-max-14',
    'macbook-pro-m5-pro-16','macbook-pro-m5-max-16');
 SELECT count(*) INTO matched_count
 FROM _macbook_price_import input
 JOIN "Product" p ON p."slug"=input."slug"
 JOIN "ProductVariant" v ON v."productId"=p."id"
  AND v."storage"=input."config"
  AND v."price"=input."firstNpr"*100
  AND v."comparePrice" IS NULL;
 IF p_count <> 8 OR v_count <> 17 OR matched_count <> 17 THEN
  RAISE EXCEPTION 'MacBook import conflict: products %, variants %, exact matches %',
   p_count,v_count,matched_count;
 END IF;
END $verify$;
COMMIT;

SELECT 'MACBOOK_PRICE_IMPORT_OK' AS result,
 count(DISTINCT p."id") AS products,
 count(v."id") AS variants,
 count(DISTINCT v."sku") AS unique_skus,
 min(v."price") AS min_paise,
 max(v."price") AS max_paise
FROM iphonebooking."Product" p
JOIN iphonebooking."ProductVariant" v ON v."productId"=p."id"
WHERE p."slug" IN
   ('macbook-neo-a18-pro-13','macbook-air-m5-13','macbook-air-m5-15',
    'macbook-pro-m5-14','macbook-pro-m5-pro-14','macbook-pro-m5-max-14',
    'macbook-pro-m5-pro-16','macbook-pro-m5-max-16');
