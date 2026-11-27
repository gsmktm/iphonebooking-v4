# Product & Media Studio — Full-Stack Operations Guide
**Draft:** 2026-11-27 · **Application:** iPhoneBooking V4 · **Status:** Preview-first rollout

## Components
- React 19 + Vite admin: `/admin/product-studio`, `/admin/history-studio`, `/admin/media-library`.
- Express 5 typed JSON APIs: product editing, historical records, immutable upload + metadata updates, and public image/credit delivery.
- Prisma 6 / PostgreSQL (private `iphonebooking` schema in the Supabase-backed preview): `Product`, `ProductVariant`, `AppleHistoryDevice`, `MediaAsset`, `AuditLog`.
- Railway **private** object-storage bucket `iphonebooking-media` (Singapore region). No S3 credentials in JavaScript bundles or GitHub source files.

## Image upload workflow
1. An authenticated staff user with `product.update` selects a JPEG, PNG or WebP, 6 MB maximum.
2. Choose **OWNED** (original photograph with publication rights) or **LICENSED** (provide HTTPS source, author/rights holder, license and license URL). Provide alt text.
3. Browser sends a same-origin binary POST to `/api/v1/admin/media/uploads`, including encoded metadata headers and the app's existing CSRF header.
4. Server validates both file signature and declared MIME, bytes, rights fields, HTTPS links and role, then uploads the object to the private S3 bucket under an unguessable UUID key.
5. The server writes a `MediaAsset` DB record and immutable audit entry. A DB failure triggers best-effort deletion of the new object.
6. Returned URL is a stable local `/api/v1/media/:uuid`. It is *not publicly readable until linked to an active retail product or historical record*. Authenticated staff with product-read permission can preview unlinked media.
7. Editor chooses cover/gallery, optionally reorders photos, then saves the parent record. This action is audited and protected by optimistic concurrency timestamps.
8. The public GET route proxies authorized image bytes from private storage. It adds proper content type, `nosniff`, ETag, and public/private cache control; the corresponding rights metadata can be viewed via the public credits API.

No executable SVG, animated GIF, remote arbitrary product image URL or unlicensed GSMArena image copying is supported. The browser is never given S3 secrets. Binary files are not stored in Supabase PostgreSQL.

## Admin operations

**Retail products** — list/search products, create a draft product, edit product identity, URL slug, description, category, badge, main photo, gallery ordering, publication and featured state, JSON specs, existing variant prices/deposits, optional verified compare-at prices, variant photos and pre-order status. Add a new variant for a new product. Stock can be changed **only** via existing inventory-ledger processes; this editor never writes stock. Existing order and payment totals are unchanged.

**Apple history** — list/filter by iPhone/Mac/iPad/iPod, edit archived name, introduction year, model identifiers, capacities, chip, original Apple research source, secondary reference, cover photo, gallery and image provenance. Create new archived records, always in the read-only public history domain; never mark them as available products. Use source-verifiable facts.

**Media library** — list/search uploaded files, view provenance, copy reusable stable media URL, update photographer/source/license/alt text, and preview images. Files are not deleted on gallery unlink, preserving historical source traceability. Reusing files avoids duplicate uploads.

## Permissions and safety
- `product.read` is required for studio access, media-library listing, draft previews and GET endpoints.
- `product.update` is required for product/history edits, photo uploads, variant edits and source metadata changes.
- `product.create` is required for creating retail products, configurations and history entries.
- Images are made public only by a parent published retail product or archival record.
- Input sizes are capped; server validates image signatures (not filename extensions). HTTPS source URLs required for third-party media. Per-image license and photographer credits remain attached to DB records.
- All editing writes produce an `AuditLog` event. Product and archive PATCH include `expectedUpdatedAt` and fail with HTTP 409 if stale.
- Existing passwords/session logic are unchanged. Never publish `MEDIA_S3_SECRET_ACCESS_KEY` or Supabase DB credentials.

## Railway preview configuration
Create **one private Railway bucket** and set *server-only* variable references on the isolated preview API service:
```text
MEDIA_S3_ENDPOINT=${{iphonebooking-media.ENDPOINT}}
MEDIA_S3_BUCKET=${{iphonebooking-media.BUCKET}}
MEDIA_S3_REGION=${{iphonebooking-media.REGION}}
MEDIA_S3_ACCESS_KEY_ID=${{iphonebooking-media.ACCESS_KEY_ID}}
MEDIA_S3_SECRET_ACCESS_KEY=${{iphonebooking-media.SECRET_ACCESS_KEY}}
MEDIA_S3_URL_STYLE=virtual-host
```
For legacy buckets, check URL style in Railway Credentials and use `path` if required. The standalone public website should never receive bucket credentials.

## API inventory
- `GET /api/v1/admin/studio/products/:id` — signed-in retail details.
- `GET /api/v1/admin/products?q=...&page=...` — existing signed-in catalog listing.
- `POST /api/v1/admin/products`, `PATCH /api/v1/admin/products/:id` — catalog changes.
- `POST /api/v1/admin/variants`, `PATCH /api/v1/admin/variants/:id` — separate price/configuration actions.
- `GET /api/v1/admin/studio/history`, `GET /api/v1/admin/studio/history/:id`, `POST .../history`, `PATCH .../history/:id` — archive editor.
- `POST /api/v1/admin/media/uploads` — body is raw image bytes, metadata in encoded headers.
- `GET /api/v1/admin/media`, `PATCH /api/v1/admin/media/:id` — media audit/provenance.
- `GET /api/v1/media/:id` — published image proxy; unpublished images only for authorized staff.
- `GET /api/v1/media/credits?slug=:productSlug` or `?archive=:historicalSlug` — public provenance.

## Preview acceptance checks
- Verify migration and app build with CI, including unauthorized upload/edit rejection, MIME signature matching, 6 MB limits and mobile navigation.
- Perform an authenticated image-upload smoke test with a staff account and a legally owned test photo. Confirm private unlinked media return 404 to public, admin preview works, linking to a product makes image available, and credit updates appear. Remove the photo from the product in a second test and verify it becomes private again.
- Verify no retail stock, price or payment changes from adding history media.
- Verify uploads above 6 MB, wrong MIME, unlicensed third-party source and expired/stale edits fail cleanly.
- Do not switch `iphonebooking.com` DNS or merge to main until owner authorizes a final production launch.

## Remaining enhancement opportunities
Automatic image compression, non-destructive cropping, batch import from rights-clear providers, moderation queue, duplicate hash detection, orphan cleanup with retention and pre-production full audit are not automatically enabled. Do not claim full GSMArena media licensing.
