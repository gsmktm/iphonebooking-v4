# Apple.com reference catalog — 27 November 2026

**Purpose:** Make iPhoneBooking a trustworthy, useful storefront even before Nepal merchant inventory is published. Preserve the original iPhoneBooking identity rather than copying Apple's site.

## Source and scope

The `AppleReferenceModel` table holds factual product-family names, short independently written descriptions and source links checked on Apple.com on **2026-11-27**. The initial 20 public records are introduced in migration `202611270001_apple_reference_catalog`.

| Family | Verified official references |
| --- | --- |
| iPhone | iPhone 18 Pro, iPhone 18 Pro Max, iPhone Air, iPhone 17e |
| Mac | MacBook Air (M5), MacBook Pro, Mac mini |
| iPad | iPad Pro, iPad Air, iPad mini, iPad |
| Apple Watch | Series 12, Ultra 4, SE 3 |
| AirPods | AirPods 5, AirPods Pro 3, AirPods Max 2 |
| Accessories | Apple Pencil Pro, Magic Keyboard, MagSafe accessories |

### Sources

The model and source URL for each item live in its DB record. Starting points:

- https://www.apple.com/iphone/ and https://www.apple.com/iphone-18-pro/
- https://www.apple.com/mac/ and https://www.apple.com/macbook-air/
- https://www.apple.com/ipad/
- https://www.apple.com/watch/compare/ and https://www.apple.com/apple-watch-series-12/
- https://www.apple.com/airpods/ and https://www.apple.com/airpods-5/
- https://www.apple.com/shop/accessories/all and https://www.apple.com/apple-pencil/

Apple changes its lineup. **This is a checked snapshot, not a live Apple API or an automatic scraper.** For every update, review the actual Apple.com page, record date and exact model name, update the reference migration or a reviewed admin import, and run E2E tests. Do not claim to have live-synced Apple when no automated licensed data feed exists.

## Data separation

- `AppleReferenceModel`: read-only editorial facts, `officialUrl`, last-checked date, text summary. **Never** contains Nepal prices, stock, SKUs, product photos, Apple authorization or merchant approval.
- `Product`, `ProductVariant`, `InventoryStock` and existing services: authoritative merchant-controlled offers and commerce data.
- `GET /api/v1/official-apple-models?category=iphone`: returns public editorial references. No mutation and no secrets.
- `GET /api/v1/products`, `/catalog`, `/categories`: existing commerce API unchanged. Empty results signify no published local offer, not a database failure.

Do not create a checkout/buy/reservation button from an Apple reference. A Buy Now button requires an actual merchant `ProductVariant` and the existing payment/stock checks.

## Photography and brand safety

Apple's third-party copyright/trademark guidelines are at
https://www.apple.com/legal/intellectual-property/guidelinesfor3rdparties.html

Apple requires express permission for Apple-owned or licensed product photographs used in third-party marketing and prohibits imitation of distinctive site design, logos or fonts. **Do not scrape/hotlink/mirror Apple.com assets into the retailer site without rights.** Use authorized distributor assets under a license or independently photographed genuine devices with permission and provenance. Existing CSS silhouettes are structural illustrations, *not genuine SKU photographs*. Show a true uploaded image only after the merchandising team verifies accuracy and usage rights. Do not imply Apple-authorized reseller or Apple-certified repair status without documentation.

## Database decision

The Railway project `iphonebooking-v4` already has a connected PostgreSQL database, with Prisma configured through `DATABASE_URL`. It was verified responsive: `/api/health` returned `ok`, while categories/products endpoints returned valid empty arrays, not connection errors. Thus a separate Supabase database would add cost, migration risk and possible split-brain inventory, and was **not** created. If a future migration to Supabase is explicitly authorized, use a staged plan with backups, schema parity, payment/session safety checks and RLS policies; never silently point the app at two different databases.

## QA / deployment

1. Run Prisma validation, migrations and E2E on isolated CI Postgres.
2. Confirm 20 reference records, their source URLs and the fact that no `price`, `stock` or `image` fields leak into the editorial API.
3. Verify each of six category routes, homepage, Shop and responsive widths.
4. Deploy to Railway preview only; do not alter `iphonebooking.com` DNS or merge PRs automatically.
5. Separately verify all Nepal seller claims, real stock, payments, delivery coverage and warranty terms before a public production launch.
