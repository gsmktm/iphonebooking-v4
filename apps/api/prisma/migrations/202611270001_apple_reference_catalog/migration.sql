-- Official Apple.com editorial model references, checked 2026-11-27.
-- These are NOT merchant inventory, Nepal prices, or purchaseable SKUs.
-- Only public product-name facts and links are stored; no Apple imagery.
CREATE TABLE "AppleReferenceModel" (
  "id" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "officialUrl" TEXT NOT NULL,
  "sourceCheckedAt" TIMESTAMP(3) NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppleReferenceModel_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AppleReferenceModel_category_sortOrder_idx" ON "AppleReferenceModel"("category", "sortOrder");
INSERT INTO "AppleReferenceModel"
  ("id", "category", "name", "summary", "officialUrl", "sourceCheckedAt", "sortOrder", "updatedAt")
VALUES
  ('iphone-18-pro', 'iphone', 'iPhone 18 Pro', 'Pro iPhone model. Check Apple for camera, processor and display specifications.', 'https://www.apple.com/iphone-18-pro/', TIMESTAMP '2026-11-27 00:00:00', 10, CURRENT_TIMESTAMP),
  ('iphone-18-pro-max', 'iphone', 'iPhone 18 Pro Max', 'Larger-screen Pro model. Compare details on the official Apple product page.', 'https://www.apple.com/iphone-18-pro/', TIMESTAMP '2026-11-27 00:00:00', 20, CURRENT_TIMESTAMP),
  ('iphone-air', 'iphone', 'iPhone Air', 'Thin and light iPhone family. Check the official specifications before comparing.', 'https://www.apple.com/iphone-air/', TIMESTAMP '2026-11-27 00:00:00', 30, CURRENT_TIMESTAMP),
  ('iphone-17e', 'iphone', 'iPhone 17e', 'Another iPhone option. Review Apple specifications and local availability separately.', 'https://www.apple.com/iphone-17e/', TIMESTAMP '2026-11-27 00:00:00', 40, CURRENT_TIMESTAMP),
  ('macbook-air-m5', 'mac', 'MacBook Air (M5)', 'Portable MacBook Air powered by the M5 chip. Check screen sizes and configuration on Apple.', 'https://www.apple.com/macbook-air/', TIMESTAMP '2026-11-27 00:00:00', 10, CURRENT_TIMESTAMP),
  ('macbook-pro', 'mac', 'MacBook Pro', 'Professional Mac notebook family. Browse current sizes, displays and chips on Apple.', 'https://www.apple.com/macbook-pro/', TIMESTAMP '2026-11-27 00:00:00', 20, CURRENT_TIMESTAMP),
  ('mac-mini', 'mac', 'Mac mini', 'Compact Mac desktop family. Compare current chip and connectivity options on Apple.', 'https://www.apple.com/mac-mini/', TIMESTAMP '2026-11-27 00:00:00', 30, CURRENT_TIMESTAMP),
  ('ipad-pro', 'ipad', 'iPad Pro', 'Apple''s professional iPad family. Confirm current sizes and compatibility on Apple.', 'https://www.apple.com/ipad-pro/', TIMESTAMP '2026-11-27 00:00:00', 10, CURRENT_TIMESTAMP),
  ('ipad-air', 'ipad', 'iPad Air', 'Portable iPad Air family. Compare displays and configurations on Apple.', 'https://www.apple.com/ipad-air/', TIMESTAMP '2026-11-27 00:00:00', 20, CURRENT_TIMESTAMP),
  ('ipad-mini', 'ipad', 'iPad mini', 'Compact iPad family. See Apple''s latest model specifications.', 'https://www.apple.com/ipad-mini/', TIMESTAMP '2026-11-27 00:00:00', 30, CURRENT_TIMESTAMP),
  ('ipad', 'ipad', 'iPad', 'Everyday iPad family. Check the official lineup for current generations.', 'https://www.apple.com/ipad/', TIMESTAMP '2026-11-27 00:00:00', 40, CURRENT_TIMESTAMP),
  ('apple-watch-series-12', 'watch', 'Apple Watch Series 12', 'Current mainline Apple Watch. Verify health-feature availability by region.', 'https://www.apple.com/apple-watch-series-12/', TIMESTAMP '2026-11-27 00:00:00', 10, CURRENT_TIMESTAMP),
  ('apple-watch-ultra-4', 'watch', 'Apple Watch Ultra 4', 'Outdoor and adventure-oriented Apple Watch. Check official specifications and coverage.', 'https://www.apple.com/newsroom/2026/09/apple-unveils-apple-watch-ultra-4/', TIMESTAMP '2026-11-27 00:00:00', 20, CURRENT_TIMESTAMP),
  ('apple-watch-se-3', 'watch', 'Apple Watch SE 3', 'Apple Watch SE family. Compare supported features and sizes on Apple.', 'https://www.apple.com/apple-watch-se-3/', TIMESTAMP '2026-11-27 00:00:00', 30, CURRENT_TIMESTAMP),
  ('airpods-5', 'airpods', 'AirPods 5', 'Open-ear wireless earbuds. See Apple for the current charging-case options.', 'https://www.apple.com/airpods-5/', TIMESTAMP '2026-11-27 00:00:00', 10, CURRENT_TIMESTAMP),
  ('airpods-pro-3', 'airpods', 'AirPods Pro 3', 'In-ear wireless earbuds with Active Noise Cancellation. Check Apple specifications.', 'https://www.apple.com/airpods-pro/', TIMESTAMP '2026-11-27 00:00:00', 20, CURRENT_TIMESTAMP),
  ('airpods-max-2', 'airpods', 'AirPods Max 2', 'Over-ear Apple headphones. Compare official connectivity and listening features.', 'https://www.apple.com/airpods-max/', TIMESTAMP '2026-11-27 00:00:00', 30, CURRENT_TIMESTAMP),
  ('apple-pencil-pro', 'accessories', 'Apple Pencil Pro', 'Stylus for compatible iPad models. Verify exact compatibility before purchase.', 'https://www.apple.com/apple-pencil/', TIMESTAMP '2026-11-27 00:00:00', 10, CURRENT_TIMESTAMP),
  ('magic-keyboard', 'accessories', 'Magic Keyboard', 'Apple keyboard accessory family. Confirm model compatibility on Apple''s store.', 'https://www.apple.com/shop/accessories/all', TIMESTAMP '2026-11-27 00:00:00', 20, CURRENT_TIMESTAMP),
  ('magsafe-accessories', 'accessories', 'MagSafe accessories', 'Explore Apple charging and magnetic accessories. Check compatible devices on Apple.', 'https://www.apple.com/shop/accessories/all', TIMESTAMP '2026-11-27 00:00:00', 30, CURRENT_TIMESTAMP);
