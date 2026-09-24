# Complete function reference — full stack

> Deep-research inventory of every function in the iPhoneBooking V2 monorepo: server foundation,
> business services, all API endpoints with their guards and behavior, the Prisma data model, every
> client-side function, the admin resource engine, PWA assets, seed/scripts/tests, and the complete
> API error-code catalog. Read alongside [architecture.md](./architecture.md), [api.md](./api.md),
> and [concept-mapping.md](./concept-mapping.md).
>
> Verified directly against source: `server/` (16 route files, 10 services, `core.ts`, `app.ts`,
> `index.ts`, `worker.ts`), `prisma/schema.prisma` (127 models) + `prisma/seed.ts`, every file under
> `src/` (45 files), `public/` (`sw.js`, `appearance.js`, manifest), `scripts/`, `tests/`. Line
> counts drift with edits; behavior notes reflect the code as read.

## 1. Server foundation

### 1.1 `server/core.ts` — cross-cutting primitives

| Function                          | Purpose                                                                                                                                                                                        |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AppError(status, code, message)` | Typed HTTP error; the only error shape routes throw deliberately. Rendered by the error handler as `{ error: { code, message, requestId } }`.                                                  |
| `hash(value)`                     | sha256 hex digest — session token hashes and order `trackingHash` (receipt keys).                                                                                                              |
| `token()`                         | 32-byte random hex — session tokens, tracking tokens, order-number seeds.                                                                                                                      |
| `identity(req, res, next)`        | Global middleware on `/api/v1`: reads the `session` cookie, looks up `UserSession` by `tokenHash`, attaches `req.user` (`User & { role }`) when unexpired. Never rejects — anonymous is valid. |
| `requireUser(req, res, next)`     | 401 `SIGN_IN_REQUIRED` when `req.user` is absent.                                                                                                                                              |
| `permit(permission)`              | Middleware factory: 401 if anonymous; 403 `ACCESS_DENIED` unless `role.permissions` contains the permission or wildcard `'*'`.                                                                 |
| `safeUser(user)`                  | Public projection `{ id, name, email, role, permissions }` — never leaks password hashes or session data.                                                                                      |
| `owned(value)`                    | Ownership guard: throws 404 `NOT_FOUND` on null, returns the value otherwise. Used by every user-scoped read/write.                                                                            |

### 1.2 `server/app.ts` — middleware pipeline (in order)

1. Disable `x-powered-by`; optional `trust proxy` (`TRUST_PROXY_HOPS`).
2. Structured access log — JSON line per finished `/api` request (skipped when `NODE_ENV=test`).
3. `helmet` CSP: `default-src 'self'`, `img-src 'self' data:`, `style-src 'self' 'unsafe-inline'`,
   `script-src 'self'`, `connect-src 'self'`, `upgrade-insecure-requests` in production.
4. Request identity: `req.requestId = randomUUID()`, echoed as `X-Request-ID`; API responses get
   `Cache-Control: no-store`.
5. Global rate limit on `/api`: 200 req/min → 429 `RATE_LIMITED`.
6. `express.json({ limit: '256kb' })`, then `cookieParser()`.
7. CSRF/origin gate for every non-`GET`/`HEAD`/`OPTIONS` `/api` request: requires
   `X-Requested-With: iPhoneBooking` (else 403 `CSRF_REJECTED`) and `Origin` matching `APP_ORIGIN`
   (else 403 `ORIGIN_REJECTED`).
8. `GET /api/health` → `SELECT 1` plus `{ status: 'ok', version: '2.0.0' }`.
9. `identity` on `/api/v1`, then the 16 router mounts (§3).
10. Inline `POST /api/v1/account/claim-order` (§3.14).
11. API 404 catch-all → 404 `NOT_FOUND`.
12. Central error handler: `AppError` → its status/code; body `SyntaxError` → 400 `INVALID_JSON`;
    `ZodError` → 422 `VALIDATION_ERROR` (path-joined messages); Prisma `P2002` → 409
    `DUPLICATE_RECORD`; `P2034` → 409 `RETRY_TRANSACTION`; anything else → 500 `INTERNAL_ERROR`
    (logged as JSON with `requestId`, generic message to the client).

### 1.3 Process entry points

- `server/index.ts` — HTTP server: mounts `GET /sitemap.xml` and `GET /robots.txt` (disallows
  `/api/`, `/admin`, `/account`, `/checkout`, `/track`); in production serves `dist/` statically
  and hands other GETs to `storefrontDocument` (§2.9); listens on `PORT` (default `4000`) /
  `HOST` (default `127.0.0.1`); graceful `SIGINT`/`SIGTERM` shutdown.
- `server/worker.ts` — background worker: `tick()` guarded by a re-entrancy flag, runs `runJobs()`
  every 15 s, drains Prisma on `SIGTERM`.
- `server/db.ts` — `export const db = new PrismaClient()`.

## 2. Business services (`server/services/`)

### 2.1 `orders.ts` — checkout engine

- **`orderSchema`** (zod): `items[]` (1–20 lines, `quantity` 1–5 each), `name`, `email` (normalized
  lowercase), `phone`, `fulfillment: PICKUP | DELIVERY`, full Nepal `address`
  (province/district/municipality/ward/area/landmark — required for delivery via `superRefine`),
  `idempotencyKey` (UUID), optional `tradeInId`, `termsAccepted: true`.
- **`createOrder(data, userId?)`** — one transaction:
  1. Idempotency replay check on `idempotencyKey` → 409 `ALREADY_SUBMITTED`.
  2. Merges duplicate `variantId` lines; per line: >5 total → 422 `QUANTITY_LIMIT`; variant must be
     active (409 `PRODUCT_UNAVAILABLE`); a stock row with `available ≥ quantity` must exist;
     optimistic reservation via conditional `updateMany` (`available −= q`, `reserved += q`) —
     count ≠ 1 → conflict.
  3. Money: `total = Σ price×q`; `dueNow = Σ (preorder ? deposit : price)×q`; oversized carts →
     422 `ORDER_VALUE_LIMIT` (contact store).
  4. Optional trade-in credit: only an `ACCEPTED`, unattached, owned trade-in with `finalValue`
     (409 `TRADE_IN_NOT_APPROVED`); credit must not exceed the order total
     (409 `CREDIT_EXCEEDS_ORDER` — no cash-out); `total −= finalValue`, `dueNow = min(dueNow, total)`.
  5. Snapshots the `prebooking-terms` CMS page into `PolicyAcceptance` (slug + version + blocks).
  6. Creates `Order` (`number = IB-<year>-<8hex>`, status `PAID` when total is 0 else `PLACED`,
     `expiresAt` = +24 h, `trackingHash = hash(trackingToken)`), nested `OrderItem`s, a `Booking`
     (`AWAITING_ALLOCATION` when fully credited, else `PENDING_PAYMENT`), an `InventoryLedger`
     `RESERVATION` entry, and a `Payment` (`CONFIRMED` when total is 0 else `PENDING`, amount
     `dueNow`).
  7. `recordOrderCharge` (§2.2) + a customer `Notification` ("reserved for 24 hours").
  8. Returns the order plus the one-time `trackingToken` (hash stripped).
- **`expireReservations()`** — worker job: finds `PLACED` orders past `expiresAt`; per order in a
  `Serializable` transaction: conditional claim to `EXPIRED` (double-worker safe), releases stock
  (`available += q`, `reserved −= q`, ledger `RELEASE`), voids the reservation charge, expires
  `PENDING` payments, cancels bookings, drops `tradeInId` (audited), writes status history.

### 2.2 `money-ledger.ts` — append-only `OrderMoneyEntry` writers

| Function                           | Entries written                                                                                                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `recordOrderCharge(tx, order)`     | `CHARGE` for gross line total (key `charge:<orderId>`); if trade-in credit made `total < gross`, a negative `TRADE_IN_CREDIT` (key `trade-credit:<orderId>`, source `ACCEPTED_INSPECTION`). |
| `recordStorePayment(tx, payment)`  | Negative `PAYMENT` (key `payment:<paymentId>`, source `STAFF_RECEIPT`) — staff cash collection.                                                                                             |
| `voidReservationCharge(tx, order)` | Negative `VOID` for the order total (key `void:<orderId>`, source `RESERVATION_EXPIRY`).                                                                                                    |

### 2.3 `payments.ts` — fail-closed provider contract

- `PaymentProvider` interface: `createPayment`, `verifyPayment`, `refundPayment`,
  `handleWebhook(rawBody, signature)`.
- `UnconfiguredProvider` — every method throws 503 `PAYMENT_NOT_CONFIGURED` ("Online payments are
  not enabled. Choose pay at store… No payment has been taken.").
- `paymentProvider: PaymentProvider = new UnconfiguredProvider()` — the single instance routes use;
  enabling a real provider is a one-line swap behind env config.

### 2.4 `valuation.ts` — deterministic trade-in estimate

`valueDevice(rule, condition, battery, functional)` → integer paisa: condition factor from the rule
(`Excellent` 100%, else `goodPercent`/`fairPercent`/`damagedPercent`), battery < 80 % applies an
85 % penalty, non-functional applies 60 %; result floored to the nearest 100 paisa.

### 2.5 `permissions.ts`

- `permissionCatalog` — 34 grants: `product.read|create|update`, `inventory.read|adjust|receive|qc`,
  `order.read|fulfill`, `payment.view|collect`, `repair.read|update|assign|qc`,
  `tradein.read|update`, `customer.read`, `store.read|update`, `content.read|update`,
  `support.read|update`, `role.read|manage`, `audit.read`, `system.read`, `report.read`,
  `device.read|inspect`, `procurement.read|create|approve`. (Roles may also hold `'*'`.)
- `assertGrantable(actor, permissions)` — 403 `PRIVILEGE_ESCALATION` unless the actor's role holds
  every permission being granted (or `'*'`).

### 2.6 `repair-quality.ts`

- `qcChecks` — the 11 mandatory items: power, display, touch, camera, speaker, microphone,
  charging, buttons, network, battery, cosmetic.
- `requireRepairQC(tx, repairId)` — 409 `QC_REQUIRED` unless a `PASSED` `RepairQC` is newer than
  the latest `QUALITY_CONTROL` history row (current-cycle QC).
- `issueRepairWarranty(tx, repairId)` — on completion, reads the latest `APPROVED` quote and
  creates a `RepairWarranty` spanning `warrantyDays` (no-op when 0).

### 2.7 `device-lifecycle.ts` — device identity/provenance

- `ensureIdentity(tx, unitId)` — idempotent `DeviceIdentity` upsert keyed by `unitId`, seeding a
  hashed `SERIAL` identity link (`valueHash` + `valueLast4` only — full serials never stored).
- `deviceEvent(tx, input)` — `ensureIdentity` then append a `DeviceEvent` (unique `eventKey`,
  actor, reference, optional location/metadata/visibility); optionally advances identity `status`.
- `verifyUnitLocation(tx, unit, stockId)` — 409 `UNIT_LOCATION_MISMATCH` when the unit is not at
  the order's stock location; returns the stock row.
- `serviceEvent(tx, input)` — customer-visible device event derived from a linked `Device`
  (no-op when the record has no device).

### 2.8 `device-risk.ts` — honest unknown

`deviceRiskProvider` (`name: 'unconfigured'`) always returns `{ result: 'UNKNOWN', reason: 'No
authorized lost/stolen or blacklist provider is connected…' }`. The registry stores digests only;
no live lookup is claimed until an authorized provider is connected.

### 2.9 `jobs.ts`, `seo.ts`, `schemas/content.ts`

- `runJobs()` — lease recovery (expired `PROCESSING` → `PENDING`, or `DEAD` after 5 attempts),
  upserts a per-minute `RESERVATION_CLEANUP` job, claims ≤10 due jobs via conditional update
  (5-min lease), runs handlers (`RESERVATION_CLEANUP` → `expireReservations()`; unknown types fail
  `UNCONFIGURED_JOB_HANDLER`), exponential backoff capped at 1 h.
- `origin()` — public origin from `APP_ORIGIN`/`PUBLIC_ORIGIN`. `sitemap()` — XML sitemap of public
  storefront routes. `storefrontDocument(req, res)` — production HTML shell injection: canonical,
  robots (`noindex` for admin/account/checkout), Open Graph/Twitter tags, JSON-LD (`<` escaped),
  hero preload; page content hydrates via the SPA.
- `contentFields` / `createContentSchema` / `updateContentSchema` — zod shape for `CMSPage` with
  optional `expectedUpdatedAt` for optimistic locking (§3.10).

## 3. API surface — every endpoint

All paths are relative to the mount shown; guards are applied per handler. Response shape is the
raw JSON object/array (no envelope). Errors: `{ error: { code, message, requestId } }`.

### 3.1 `routes/auth.ts` → `/api/v1/auth` (rate-limited 30/15 min on register/login/password)

| Method + path          | Guard         | Behavior                                                                                                                                                                |
| ---------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /register`       | —             | Zod credentials (email ≤254 lowercased, password 12–128, name required); duplicate → 409; bcrypt hash; creates user + HttpOnly `session` cookie (token hashed at rest). |
| `POST /login`          | —             | Same schema; wrong credentials → uniform 401; issues session with `userAgent`.                                                                                          |
| `GET /me`              | —             | `safeUser(req.user)` or `null`.                                                                                                                                         |
| `POST /logout`         | —             | Deletes the current session, clears cookie.                                                                                                                             |
| `GET /sessions`        | `requireUser` | Lists the user's sessions (id, dates, userAgent).                                                                                                                       |
| `DELETE /sessions/:id` | `requireUser` | Revokes one owned session (404 via `owned`).                                                                                                                            |
| `POST /password`       | `requireUser` | Password change; rotates/revokes sessions.                                                                                                                              |

### 3.2 `routes/catalog.ts` → `/api/v1` (public)

| Method + path         | Behavior                                                                                                                                                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /config`         | `{ environment, developmentData, currency: 'NPR', payments: ['STORE'], onlinePaymentsConfigured: false }` — client capability flags.                                                                                                                            |
| `GET /categories`     | All categories.                                                                                                                                                                                                                                                 |
| `GET /products`       | Filtered list (≤100): `category` slug, `q` (name/SKU contains), `storage`, `color`, `stock=in-stock`, `sort` = featured (default) / newest / price-low / price-high (price sorts computed in JS from min variant price). Includes category + variants (+stock). |
| `GET /products/:slug` | Active product with variants, stock, and active accessories; 404 via `owned`.                                                                                                                                                                                   |
| `GET /stores`         | All stores.                                                                                                                                                                                                                                                     |
| `GET /content/:slug`  | Published `CMSPage` only; else 404.                                                                                                                                                                                                                             |
| `GET /articles`       | Published pages with slug prefix `support-` (slug/title/description).                                                                                                                                                                                           |
| `POST /subscribe`     | Email + `consent: true`; idempotent upsert into `Subscriber`; 201.                                                                                                                                                                                              |
| `POST /events`        | Analytics: enum of 7 funnel events (`product_viewed` … `repair_started`) + optional `entityId`; 202.                                                                                                                                                            |

### 3.3 `routes/commerce.ts` → `/api/v1` (checkout + payments)

| Method + path                      | Behavior                                                                                                                                                 |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /orders`                     | `orderSchema.parse` → `createOrder(data, req.user?.id)`; 201 with `trackingToken`.                                                                       |
| `POST /tracking`                   | Guest order tracking: `{ number, receiptKey }` → matches `trackingHash`; returns number/status/createdAt/history/booking only.                           |
| `POST /payments`                   | `paymentProvider.createPayment({ orderId, amount: dueNow, currency })` for an order owned by the caller — currently always 503 `PAYMENT_NOT_CONFIGURED`. |
| `POST /payments/webhook/:provider` | Always 503 `PROVIDER_NOT_CONFIGURED` (no provider configured).                                                                                           |

### 3.4 `routes/account.ts` → `/api/v1/account` (whole router `requireUser`)

| Method + path                                     | Behavior                                                                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `GET /overview`                                   | Counts (orders, devices, repairs, tradeIns) + 10 latest notifications.                                                   |
| `GET /orders`                                     | Owned orders with items/variant/product, history, booking, payments+refunds; `trackingHash`/`idempotencyKey` omitted.    |
| `GET /devices`                                    | Owned `Device`s with unit (serialLast4, variant, product), repairs, tradeIns.                                            |
| `GET /notifications` · `PATCH /notifications/:id` | List all · mark read (`updateMany` scoped to owner).                                                                     |
| `GET/POST/DELETE /wishlist[/:id]`                 | List (full product embed) · upsert product · remove; every mutation bumps `shopRevision`.                                |
| `GET/POST /addresses`                             | List · create owned address (label/province/district/municipality/ward/area/landmark/phone).                             |
| `GET/PUT /cart`                                   | Legacy server cart: list · replace-all (≤20 items, qty 1–5) inside a transaction that bumps `shopRevision`.              |
| `GET/POST /tickets`, `POST /tickets/:id/messages` | Support tickets + threaded messages (owned).                                                                             |
| `POST /refunds`                                   | Refund request for a `CONFIRMED` payment with no prior refunds (409 `REFUND_UNAVAILABLE`); creates full-amount `Refund`. |
| `PATCH /profile`                                  | Update own display name (2–100).                                                                                         |

### 3.5 `routes/shop-state.ts` → `/api/v1/account` (`requireUser`) — revisioned sync

| Method + path     | Behavior                                                                                                                                                                                                                                                                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /shop-state` | `RepeatableRead` snapshot: `{ accountId, revision: shopRevision, cart: CartLine[], wishlist: productId[] }` hydrated from `CartItem`/`Wishlist`.                                                                                                                                                                                                            |
| `PUT /shop-state` | Strict body `{ accountId, revision, cart ≤20, wishlist ≤200 }`; 409 `ACCOUNT_CHANGED` on user mismatch; 422 `DUPLICATE_ITEM` on repeats; optimistic claim `updateMany(where shopRevision = revision)` → 409 `SHOP_STATE_CHANGED` if another device won; 422 `SAVED_ITEM_UNAVAILABLE` if any id vanished; replace-all cart/wishlist; returns `revision + 1`. |

### 3.6 `routes/services.ts` → `/api/v1` (trade-in + repair, customer side)

| Method + path                                | Guard         | Behavior                                                                                                                                                                                                 |
| -------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /trade-in/rules`                        | —             | Active `TradeInRule`s (model + id) for the estimator.                                                                                                                                                    |
| `POST /trade-in/quote`                       | —             | Instant estimate: loads active rule by model (404 if none) → `valueDevice(...)`; nothing persisted.                                                                                                      |
| `GET /trade-ins`                             | `requireUser` | Owned trade-ins with quotes.                                                                                                                                                                             |
| `POST /trade-ins`                            | `requireUser` | Validates optional owned `deviceId`; creates `TradeIn` + initial `TradeInQuote` (`stage: CUSTOMER_ESTIMATE`, `status: ESTIMATE`, reason code `RULE_BASED_ESTIMATE`) using `valueDevice`.                 |
| `POST /trade-ins/:id/decision`               | `requireUser` | Customer accepts/rejects the `FINAL_OFFER`: guarded `updateMany(status: INSPECTED)` → 409 `QUOTE_NOT_READY`; updates latest final quote status; audited (`tradein.quote.decision`).                      |
| `GET /repairs`                               | `requireUser` | Owned repairs with history/quotes.                                                                                                                                                                       |
| `POST /repairs`                              | `requireUser` | Creates repair (`model`, `issue`, `description`, `method: STORE \| PICKUP`, optional future `appointment` — past → 422 `PAST_APPOINTMENT`, optional owned `deviceId`) + initial `REQUESTED` history row. |
| `POST /repairs/:id/quotes/:quoteId/decision` | `requireUser` | Accept/reject a `PENDING` quote → `APPROVED`/`REJECTED` with `decidedAt` (guarded `updateMany`).                                                                                                         |

### 3.7 `routes/device-lifecycle.ts` → `/api/v1`

| Method + path                                | Guard              | Behavior                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST /admin/units`                          | `inventory.adjust` | Register a serialized unit: strict body (`variantId`, `serial` 6–40, optional `stockId`); resolves exactly one stock location (422 `STOCK_LOCATION_REQUIRED`), enforces serials ≤ received quantity (409 `RECEIPT_REQUIRED`), stores only `serialHash` + `serialLast4`, emits `RECEIVED` device event + audit; `Serializable` transaction; 201 `{ id, serialLast4, status, canonicalId }`. |
| `GET /account/devices/:id/passport`          | `requireUser`      | Permission-filtered device passport projection (identity, events, provenance, current stock/store) — never a separately edited copy.                                                                                                                                                                                                                                                       |
| `POST /admin/device-identity/:id/risk-check` | `device.inspect`   | Runs `deviceRiskProvider.check` (→ `UNKNOWN` today), persists `DeviceRiskCheck` + audit; 201 `{ id, result, reason }`.                                                                                                                                                                                                                                                                     |

### 3.8 `routes/legacy-scaffolds.ts` → `/api/v1` — deliberate 501s

For every path in `scaffoldPaths` (~80 generated module names: `deviceIdentity`, `repairBOM`,
`posSession`, `launchConfig`, `workflowDefinition`, `featureFlag`, `incident`, …), any request is
guarded by `permit('platform.scaffold.read')` and then always throws 501
`WORKFLOW_NOT_IMPLEMENTED` — the generated tables exist in the schema, but the supported domain
workflows (§3.6–3.7, 3.9–3.13) are the only operational entry points.

### 3.9 `routes/admin-create.ts` → `/api/v1/admin` (create-side CRUD, each audited)

| Method + path               | Guard              | Behavior                                                                                                                              |
| --------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /categories`          | `product.create`   | Create category.                                                                                                                      |
| `POST /variants`            | `product.create`   | Create variant (sku/color/colorHex `#rrggbb`/storage/price/deposit paisa, `deposit ≤ price`, preorder flag) + `variant.create` audit. |
| `POST /inventory`           | `inventory.adjust` | Create `InventoryStock` for variant+store.                                                                                            |
| `POST /stores`              | `store.update`     | Create store.                                                                                                                         |
| `POST /content`             | `content.update`   | Create `CMSPage` (+ audit).                                                                                                           |
| `POST /valuation-rules`     | `tradein.update`   | Create `TradeInRule` (+ audit).                                                                                                       |
| `PATCH /customers/:id/role` | `role.manage`      | Assign a role to a customer (guards grantable set).                                                                                   |

### 3.10 `routes/admin.ts` → `/api/v1/admin` (reads + update-side CRUD)

| Method + path                             | Guard                                                        | Behavior                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /dashboard`                          | `report.read`                                                | Parallel aggregates: order/booking counts, open repairs, submitted trade-ins, low stock (<3), confirmed revenue, 8 recent orders, analytics event groupBy.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `GET /:resource`                          | per-resource map (113 resources → permission; unknown → 403) | Generic paginated list: `page`/`q` (case-insensitive contains on the resource's natural keys), `take 50`. Explicit `switch` implementations for 34 resources: `products`, `categories`, `variants`, `inventory`, `inventory-ledger`, `units`, `orders`, `bookings`, `payments`, `refunds`, `repairs`, `trade-ins`, `valuation-rules`, `customers`, `stores`, `content`, `tickets`, `notifications`, `roles`, `audit-logs`, `jobs`, `subscribers`, `order-ledger`, `suppliers`, `purchase-orders`, `receipts`, `device-risk-check`, `device-identity`, `device-event`, `parts`, `part-movements`, `repair-qc`, `repair-warranty`, `trade-in-quote`, (+ joins/omits per case — e.g. orders omit `trackingHash`/`idempotencyKey`); resources mapped but unimplemented return `{ rows: [], total: 0 }`. |
| `POST /products` · `PATCH /products/:id`  | `product.create` / `product.update`                          | Create / update product.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `PATCH /variants/:id`                     | `product.update`                                             | Update variant pricing/flags.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `POST /inventory/:id/adjust`              | `inventory.adjust`                                           | Signed adjustment (≠0, ±10000) + reason; 409 `NEGATIVE_STOCK` if it would go below zero; writes `ADJUSTMENT` ledger + audit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `GET /content/:id` · `PATCH /content/:id` | `content.read` / `content.update`                            | Fetch / update `CMSPage` with optimistic locking on `updatedAt` (409 `CONTENT_CHANGED`) + full before/after audit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `PATCH /valuation-rules/:id`              | `tradein.update`                                             | Update rule (`baseValue`, percentages, `active`) + `valuation.update` audit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

### 3.11 `routes/operations.ts` → `/api/v1/admin` (order/repair/trade-in operations)

| Method + path                  | Guard             | Behavior                                                                                                                                                                                                                                                                             |
| ------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST /orders/:id/collect`     | `payment.collect` | Record a store payment against an open order: 409 `ORDER_CLOSED` / `PAYMENT_REQUIRED` / `OVERPAYMENT`; creates `Payment` + `recordStorePayment` ledger entry.                                                                                                                        |
| `POST /orders/:id/fulfill`     | `order.fulfill`   | Hand over: 409 `PAYMENT_REQUIRED` until fully paid; allocation set must match provided unit ids; per item `verifyUnitLocation` → set unit `SOLD` (+ device event, customer-linked `Device`), stock decrement + ledger, booking → `DELIVERED`, order → `DELIVERED` with history note. |
| `POST /orders/:id/allocate`    | `order.fulfill`   | Reserve specific serials: requires verified deposit/full payment (409 otherwise), one allocation per order; conditional unit claim `AVAILABLE → RESERVED` (with allocation), `verifyUnitLocation` + device event.                                                                    |
| `PATCH /orders/:id/status`     | `order.fulfill`   | Status transition with a fixed allow-list (e.g. `READY → [COMPLETED, OUT_FOR_DELIVERY]`); illegal move → 409 `INVALID_TRANSITION`.                                                                                                                                                   |
| `PATCH /repairs/:id/status`    | `repair.update`   | Repair state machine; → `READY` requires `requireRepairQC` (409 `QC_REQUIRED`); → `COMPLETED` runs `issueRepairWarranty`; illegal → 409 `INVALID_TRANSITION`.                                                                                                                        |
| `POST /repairs/:id/quote`      | `repair.update`   | Staff creates a priced `RepairQuote` (warranty days, amount) for customer decision.                                                                                                                                                                                                  |
| `PATCH /trade-ins/:id/inspect` | `tradein.update`  | Staff inspection: 409 `ALREADY_INSPECTED` unless `SUBMITTED`; records final value/quote (`FINAL_OFFER` stage) → status `INSPECTED`.                                                                                                                                                  |
| `POST /tickets/:id/messages`   | `support.update`  | Staff reply on a support ticket.                                                                                                                                                                                                                                                     |

### 3.12 `routes/procurement.ts` → `/api/v1/admin`

| Method + path                       | Guard                 | Behavior                                                                                                      |
| ----------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------- |
| `POST /suppliers`                   | `procurement.create`  | Create a `PartSupplier` record + audit.                                                                       |
| `POST /purchase-orders`             | `procurement.create`  | Create PO (lines with qty/cost) + audit.                                                                      |
| `POST /purchase-orders/:id/approve` | `procurement.approve` | Reason 10–500 required; 409 `INDEPENDENT_APPROVER_REQUIRED` if the creator approves their own PO (four-eyes). |
| `POST /purchase-orders/:id/receive` | `inventory.receive`   | Receive PO lines into `InventoryStock` (+ ledger, status updates).                                            |
| `POST /receipts/:id/qc`             | `inventory.qc`        | Record goods-receipt QC pass/fail.                                                                            |

### 3.13 Repair admin, roles, finance

| Method + path                             | Guard              | Behavior                                                                                                                                                |
| ----------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /repair-technicians`                 | `repair.assign`    | List assignable technicians.                                                                                                                            |
| `POST /repairs/:id/assign`                | `repair.assign`    | Create `RepairAssignment` for a technician.                                                                                                             |
| `POST /parts` · `POST /parts/:id/receive` | `inventory.adjust` | Create part catalog entry · receive stock.                                                                                                              |
| `POST /repairs/:id/parts`                 | `repair.update`    | Attach/consume parts on a repair (BOM usage).                                                                                                           |
| `GET /repairs/qc-checklist`               | `repair.read`      | Returns the 11 `qcChecks`.                                                                                                                              |
| `POST /repairs/:id/qc`                    | `repair.qc`        | Persist a `RepairQC` result (drives `requireRepairQC`).                                                                                                 |
| `GET /permission-catalog`                 | `role.read`        | The 34-permission catalog.                                                                                                                              |
| `POST /roles`                             | `role.manage`      | Create role; `assertGrantable` (403 `PRIVILEGE_ESCALATION`); dedupes permissions; audited.                                                              |
| `PATCH /roles/:id`                        | `role.manage`      | Update role; 409 `PROTECTED_ROLE` for `*` roles or your own role; re-checks grantable on old+new sets; revokes all sessions of role members; audited.   |
| `GET /reconciliation`                     | `payment.view`     | `RepeatableRead` page of orders with confirmed-payment sums vs `OrderMoneyEntry` groupBy totals → per-order paid/total/entry counts for finance review. |

### 3.14 App-level routes (`app.ts` / `index.ts`)

| Method + path                      | Guard         | Behavior                                                                                                                                                                           |
| ---------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/health`                  | —             | `SELECT 1` → `{ status: 'ok', version: '2.0.0' }`.                                                                                                                                 |
| `POST /api/v1/account/claim-order` | `requireUser` | Attach a guest order to the signed-in account: `{ number, receiptKey }` must hash to the order's `trackingHash` and the order must be unclaimed (`userId: null`); 404 via `owned`. |
| `GET /sitemap.xml`                 | —             | Public URL sitemap from `origin()`.                                                                                                                                                |
| `GET /robots.txt`                  | —             | Disallow `/api/`, `/admin`, `/account`, `/checkout`, `/track`; points at the sitemap.                                                                                              |
| `GET /{*path}` (prod only)         | —             | Static `dist/` (1 h cache) with `storefrontDocument` as the HTML shell.                                                                                                            |

Router mount order (`app.ts`): `identity` → `auth` → `catalog` → `commerce` → `shopState` →
`account` → `services` → `legacyScaffolds` → `deviceLifecycle` → (`adminCreate`, `operations`,
`repairOperations`, `repairAssignment`, `procurement`, `finance`, `roles`, `admin` under
`/api/v1/admin`) → `claim-order` → API 404 → error handler.

## 4. Data model — 127 Prisma models

No Prisma `enum`s: statuses are plain strings constrained in code. Grouped by domain (full field
definitions live in `prisma/schema.prisma`):

| Domain              | Models                                                                                                                                                                                                                                                                                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity & access   | `Role`, `User`, `UserSession`, `Address`                                                                                                                                                                                                                                                                                                                             |
| Catalog             | `Category`, `Product`, `ProductVariant`, `AccessoryCompatibility`, `Store`                                                                                                                                                                                                                                                                                           |
| Inventory           | `InventoryStock`, `InventoryLedger`, `InventoryUnit`, `InventoryBin`, `StocktakeSession`, `InventoryAging`                                                                                                                                                                                                                                                           |
| Orders & payments   | `Order`, `OrderItem`, `OrderStatusHistory`, `Booking`, `BookingAllocation`, `Payment`, `Refund`, `OrderMoneyEntry`, `PolicyAcceptance`, `CartItem`, `Wishlist`                                                                                                                                                                                                       |
| Trade-in & repair   | `TradeIn`, `TradeInRule`, `TradeInQuote`, `Repair`, `RepairAssignment`, `RepairStatusHistory`, `RepairQuote`, `RepairQC`, `RepairQCCheckItem`, `RepairWarranty`, `DeviceReplacement`                                                                                                                                                                                 |
| Device identity     | `Device`, `DeviceIdentity`, `IdentityLink`, `DeviceEvent`, `DevicePassport`, `DeviceProvenance`, `DeviceRiskCheck`, `ConditionEvidence`, `ConditionSnapshot`, `RefurbishedDevice`                                                                                                                                                                                    |
| Parts & procurement | `Part`, `PartSupplier`, `PartMovement`, `PartCompatibility`, `RepairBOM`, `RepairBOMItem`, `PurchaseRequest`, `PurchaseOrder`, `GoodsReceivedNote`, `SupplierScorecard`                                                                                                                                                                                              |
| Content & support   | `CMSPage`, `Document`, `DocumentVersion`, `SupportTicket`, `TicketMessage`, `Notification`, `Subscriber`                                                                                                                                                                                                                                                             |
| Platform & audit    | `AuditLog`, `WebhookEvent`, `Job`, `AnalyticsEvent`, `APIClient`, `WebhookLog`, `OutboxMessage`, `IntegrationConfig`, `IntegrationLog`, `SyncChange`, `SearchLog`, `DataQualityIssue`, `FeatureFlag`, `Experiment`, `ExperimentVariant`, `WorkflowDefinition`, `WorkflowRun`, `WorkflowStep`, `WorkflowEvent`, `WorkflowTask`, `WorkflowApproval`, `ApprovalRequest` |
| Store operations    | `Appointment`, `QueueToken`, `POSSession`, `ScanLog`, `FulfillmentPromise`, `FulfillmentUnit`, `ReverseLogistics`, `CourierProvider`, `CourierShipment`                                                                                                                                                                                                              |
| Launch & allocation | `LaunchConfig`, `AllocationRule`, `AllocationEntry`, `WaitlistEntry`, `BotSignal`                                                                                                                                                                                                                                                                                    |
| Finance & pricing   | `FinancialLedger`, `ReconciliationMismatch`, `FinancingApplication`, `PriceIntelligence`, `PricingGuardrail`, `PromotionSimulation`                                                                                                                                                                                                                                  |
| Growth & B2B        | `Bundle`, `BundleItem`, `Organization`, `B2BContact`, `BulkQuote`, `Retailer`, `RetailerSettlement`, `WarrantyEntitlement`, `LoyaltyLedgerEntry`, `Referral`, `AccessoryFitCheck`, `AIConversation`                                                                                                                                                                  |
| Observability       | `OpsAlert`, `SLAConfig`, `SLATracking`, `EscalationPolicy`, `Forecast`, `Simulation`, `ServiceStatus`, `Incident`, `MigrationRun`                                                                                                                                                                                                                                    |

Fields that carry the invariants documented above: `User.shopRevision` (cart/wishlist optimistic
revision), `Order.trackingHash` + `idempotencyKey` (unique), `InventoryStock.available/reserved`,
`InventoryUnit.serialHash/serialLast4`, `OrderMoneyEntry.eventKey` (unique — ledger idempotency),
`DeviceIdentity.canonicalId` (digest-only identity), `CMSPage.updatedAt` (content optimistic
locking).

## 5. Client functions (`src/`)

### 5.1 `src/services/api.ts` — fetch layer + formatters

| Function                 | Behavior                                                                                                                                                                                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ApiError`               | `Error` subclass carrying `code` + `requestId`.                                                                                                                                                                                                                 |
| `api<T>(path, options)`  | `fetch('/api/v1' + path)` with `credentials: 'same-origin'` and the CSRF header `X-Requested-With: iPhoneBooking`; non-OK → `ApiError` parsed from `{ error: { code, message, requestId } }`; unparseable body → `INVALID_RESPONSE` with a reassurance message. |
| `post<T>(path, data)`    | JSON `POST` shorthand.                                                                                                                                                                                                                                          |
| `money(value)`           | Integer paisa → `NPR …` via `Intl.NumberFormat('en-NP')` (drops decimals when whole).                                                                                                                                                                           |
| `human(value)`           | `STATUS_CODE` → `Status code`.                                                                                                                                                                                                                                  |
| `date(value)`            | ISO → `en-GB` short date.                                                                                                                                                                                                                                       |
| `track(name, entityId?)` | Fire-and-forget `POST /events` (silently swallowed).                                                                                                                                                                                                            |

### 5.2 `src/store/shop.ts` — zustand cart (`useShop`, persisted as `iphonebooking-shop-v2`)

State: `ownerId`, `revision`, `dirty`, `cart: CartLine[]`, `compare: string[]`,
`wishlist: string[]`. Actions: `add(product, variant)` (merges, hard cap qty 5),
`quantity(variantId, n)` (≤0 removes), `clear()`, `toggleCompare(id)` (max 4, newest kept),
`toggleWishlist(productId)` (all mutations mark `dirty` for server sync).

### 5.3 `src/app/` — sync + shell

- **`useCustomerSync(user)`** (`Shell` mounts it) — account-scoped replication of cart/wishlist:
  `bootstrap()` GETs `/account/shop-state`; anonymous local carts are merged
  (`mergeAnonymous`: max quantity per variant, union wishlist); signed-in dirty local state with a
  stale revision raises `SHOP_STATE_CHANGED` and surfaces **`keepLocal()` / `loadSaved()`** choices
  (never silently overwrites); `flush()` PUTs the snapshot in a loop until clean, debounced 350 ms
  via store subscription; `ACCOUNT_CHANGED` invalidates the `me` query; sign-out wipes local
  owner-scoped state.
- **`mergeAnonymous(local, remote)`** — pure merge used at sign-in (max qty per variant, union).
- **`i18n.ts`** — `messages` dictionary + `t(key)` (English keys).
- **`App.tsx`** — route table: `/admin[/ :resource]` (outside `Shell`), storefront routes under
  `Shell` (`/`, `/store`, `/prebook`, `/wishlist`, 8 category aliases, `/products/:slug`,
  `/cart`, `/checkout`, `/confirmation`, `/compare`, `/track`, `/trade-in` + `/exchange` +
  `/sell-device`, `/repair`, `/account[...]`, `/account/devices/:id`, `/support[...]`,
  `/policies/:slug`, `/campaign/:slug`, `/stores[...]`, `*` → 404); `PageMetadata` (document.title
  per route), `ErrorBoundary` class fallback with reload, lazy-loaded pages, `Suspense` loader.
- **`main.tsx`** — `QueryClient` (`retry: 1`, `staleTime: 30s`, no refetch-on-focus; mutations
  no retry); imports 7 stylesheets; registers `/sw.js` in production.

### 5.4 Pages — exported components and their data functions

| File                             | Exports                                                                                           | Key functions / queries                                                                                                                                                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Home.tsx`                       | `Home`                                                                                            | Featured products, categories, CMS content queries.                                                                                                                                                                                         |
| `Catalog.tsx`                    | `Catalog`                                                                                         | Category from path/params, URL-synced filters (`category/q/sort/storage/color/stock`), `GET /products`, wishlist view mode.                                                                                                                 |
| `Product.tsx`                    | `Product`                                                                                         | `GET /products/:slug`, variant selection, CTA + compare/wishlist actions.                                                                                                                                                                   |
| `Commerce.tsx`                   | `Cart`, `Checkout`, `Compare`, `Tracking`                                                         | `Checkout.submit()` → `POST /orders` with UUID `idempotencyKey` → `navigate('/confirmation', { state: { order } })`; 3-step wizard (contact → fulfillment → review); `Compare` pulls compared products; `Tracking` form → `POST /tracking`. |
| `Confirmation.tsx`               | `Confirmation`                                                                                    | Reads router state; `download()` writes the private receipt `.txt` (order number, totals, `trackingToken`, expiry warning, `/track` link).                                                                                                  |
| `Services.tsx`                   | `TradeInPage`, `RepairPage`                                                                       | `quote()` → `POST /trade-in/quote`; `submit()` → `POST /trade-ins`; repair intake → `POST /repairs`.                                                                                                                                        |
| `Information.tsx`                | `Support`, `Content`, `Stores`, `NotFound`                                                        | Support hub, CMS content by slug (`/support`, `/policies`, `/campaign`), store list.                                                                                                                                                        |
| `Account.tsx`                    | `SignIn` (+`admin` mode), `Account`                                                               | Auth forms → `POST /auth/register\|login`, logout → `POST /auth/logout`; section switcher (overview/orders/devices/repairs/trade-ins/addresses/notifications/tickets/security/settings/wishlist).                                           |
| `account/Lifecycle.tsx`          | `Timeline`, `AccountOrders`, `AccountDevices`, `AccountRepairs`, `AccountTradeIns`                | Repair `decide()` → `POST /repairs/:id/quotes/:quoteId/decision`; trade-in `decide()` → `POST /trade-ins/:id/decision`.                                                                                                                     |
| `account/Settings.tsx`           | `AccountNotifications`, `AccountTickets`, `AccountSecurity`, `AccountAddresses`, `AccountProfile` | Mark-read, ticket thread, sessions (`GET/DELETE /auth/sessions`), password change, address CRUD, profile rename.                                                                                                                            |
| `account/Passport.tsx`           | `Passport`                                                                                        | `GET /account/devices/:id/passport` — device provenance timeline.                                                                                                                                                                           |
| `Admin.tsx`                      | `Admin`                                                                                           | `me` + permission-gated resource navigator (groups from `admin/resources.ts`); dashboard vs `ResourcePage`.                                                                                                                                 |
| `admin/Dashboard.tsx`            | `Dashboard`                                                                                       | `GET /admin/dashboard` aggregates.                                                                                                                                                                                                          |
| `admin/ResourcePage.tsx`         | `ResourcePage`                                                                                    | Generic table: `GET /admin/:resource` (page/q), client filter, `exportRows()` CSV export, per-resource actions/create dialogs (`resource-actions.ts`, `resource-create.ts`), special editors.                                               |
| `admin/ContentEditor.tsx`        | `ContentEditor`                                                                                   | Optimistic-locked CMS editing (`expectedUpdatedAt`).                                                                                                                                                                                        |
| `admin/RoleEditor.tsx`           | `RoleEditor`                                                                                      | Role create/update against `GET /admin/permission-catalog`.                                                                                                                                                                                 |
| `admin/RepairQCForm.tsx`         | `RepairQCForm`                                                                                    | The 11-point QC checklist → `POST /admin/repairs/:id/qc`.                                                                                                                                                                                   |
| `admin/TechnicianAssignment.tsx` | `TechnicianAssignment`                                                                            | `GET /admin/repair-technicians` → `POST /admin/repairs/:id/assign`.                                                                                                                                                                         |

### 5.5 Shared components

- **`components/Shell.tsx`** — `Shell`: header/footer/nav chrome around all storefront routes;
  mounts `useCustomerSync`.
- **`components/ProductCard.tsx`** — `ProductCard`: product tile with CTA + compare/wishlist.
- **`components/ui.tsx`** — `Brand`, `ArrowLink`, `ButtonLink`, `ProductVisual`,
  `SectionHeading`, `PageIntro`, `ErrorNotice(error, retry)`, `Loading`, `Empty`, `Dialog`,

## 6. Client building blocks — features, admin resource engine, types

### 6.1 `src/features/` — feature components

| File                                        | Exports                                      | Behavior                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `features/appearance/AppearanceControl.tsx` | `AppearanceControl()`                        | Theme `<select>` (dark/light/system) bound to `window.iphonebookingAppearance` via `useSyncExternalStore`; i18n labels through `t()`, `SunMoon` icon, `useId()` for the visually-hidden label. Backing store is `public/appearance.js` (§7.2).                                                                                                                                                                         |
| `features/home/HomeHero.tsx`                | default `HomeHero({ title?, body?, href? })` | Campaign hero section (`aria-labelledby`), i18n defaults (`heroTitle`/`heroText`), primary `ButtonLink` → `href ?? '/store'`, secondary `ArrowLink` → `/compare`; imports `home-hero.css`.                                                                                                                                                                                                                             |
| `features/home/QuickConfigure.tsx`          | default `QuickConfigure({ product })`        | Variant configurator: auto-selects the first in-stock variant, dedupes colors (`[...new Set(variants.map(v => v.color))]`), storage options per color, availability = any `stock.available > 0`; price via `money()` (client never computes — §10.1); captions **Pre-booking available / In stock / Currently unavailable**; `add(product, variant)` → zustand shop store + `added` flag; CTA `disabled={!available}`. |
| `features/pwa/MobileApp.tsx`                | `InstallApp()`, `MobileNavigation()`         | `InstallApp`: intercepts `beforeinstallprompt` (prevents default, stores the event), clears on `appinstalled`; self-hides when `display-mode: standalone` or iOS `navigator.standalone`; help dialog when no prompt arrives. `MobileNavigation`: bottom `NavLink` bar — Home `/`, Shop `/store`, Care `/repair`, Account `/account` — returning `null` on `/products/*`, `/checkout`, `/cart`, `/confirmation`.        |

### 6.2 Admin resource engine (`src/pages/admin/resource-*.ts`)

| File                  | Exports                                                     | Role                                                                                                                                                                                                                                                                                                                              |
| --------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `resource-types.ts`   | `Field`, `Action`, `Row`, `Resource`, `getValue(row, path)` | Contracts for the generic admin table: `Field` types `text \| number \| textarea \| json \| checkbox`; `Action` = `POST`/`PATCH` + `fields` + `permission` (+ optional `initial`, `help`); `Resource` = `title`, `description`, `permission`, `columns` (`money?`, `status?` flags). `getValue` walks dot-paths (`a.b.c`) safely. |
| `resource-actions.ts` | `actionsFor(resource, row)`                                 | Maps `(resource, row)` → the row-level `Action[]` declared for that resource (label, path, method, form fields, required permission).                                                                                                                                                                                             |
| `resource-create.ts`  | `createAction(resource)`                                    | The resource's create-dialog `Action` (POST path + form fields), if one is defined.                                                                                                                                                                                                                                               |
| `resources.ts`        | `resources` registry + re-exports                           | **113-resource** `Record<string, Resource>` — single source of truth for titles/permissions/columns, consumed by `ResourcePage` and `Admin.tsx`.                                                                                                                                                                                  |

### 6.3 `src/services/types.ts` — client-side contracts

14 interfaces mirroring API payloads: `Variant`, `Category`, `Product`, `Store`, `User`,
`ContentPage`, `History`, `Payment`, `Order`, `Repair`, `TradeIn`, `Device`, `Notification`,
`Ticket`. TypeScript convenience only — runtime truth stays with zod validation on the server.

### 6.4 Utilities & styles

- `src/utils/cn.ts` — `cn(...inputs)` = `twMerge(clsx(inputs))`.
- `src/styles/` — `tokens.css`, `storefront.css`, `luxe.css`, `pages.css`, `admin.css`,
  `appearance.css`, `tailwind.css` (7 stylesheets, all imported by `main.tsx` — §5.1).

## 7. PWA & public assets (`public/`)

### 7.1 `public/sw.js` (9 lines — service worker)

- `CACHE = 'iphonebooking-public-v4'` — **only** same-origin public static assets are cached;
  account pages and API responses are network-only (file header comment).
- `install` → precaches `/offline.html`, `/icon.svg`, `/appearance.js`; `self.skipWaiting()`.
- `activate` → deletes every other `iphonebooking-public-*` cache; `self.clients.claim()`.
- `fetch` → ignores cross-origin, non-GET, and `/api/*` requests; document navigations try the
  network first and fall back to the cached `/offline.html`.

### 7.2 `public/appearance.js` (52 lines — no-module IIFE)

Theme store available before React boots (no flash of wrong theme):

- localStorage key `iphonebooking-appearance`; `valid()` restricts values to
  `light | dark | system`; `read()` tolerates missing/garbage values.
- `apply()` resolves `system` through `matchMedia('(prefers-color-scheme: dark)')`, then sets
  `documentElement.dataset.theme`, `style.colorScheme`, the background color (`#071014` dark /
  `#faf9f6` light), and `<meta name="theme-color">`; notifies all listeners.
- Exposes `Object.freeze(window.iphonebookingAppearance)` = `{ getSnapshot, subscribe,
setPreference }` — exactly the `useSyncExternalStore` contract `AppearanceControl` consumes
  (§6.1).
- Re-applies on OS theme change (`media 'change'` listener) and cross-tab `storage` events;
  `setPreference` persists with try/catch (private browsing may deny storage).

### 7.3 Other assets

`manifest.webmanifest` (install metadata), `offline.html` (navigation fallback, precached),
`icon-192.png` / `icon-512.png` / `icon.svg`, `images/`. `main.tsx` registers `/sw.js` in
production only (§5.1).

## 8. Seed, scripts & tests

### 8.1 `prisma/seed.ts` (376 lines)

Guard first — throws unless `NODE_ENV !== 'production' && SEED_DEVELOPMENT === 'true'`. Then only
idempotent `upsert`s with `update: {}` (never overwrites existing rows):

| Step           | Data                                                                                                                                                                                                                                                                                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Categories     | 8 Apple-family categories (iphone, mac, ipad, watch, airpods, vision, home, accessories)                                                                                                                                                                                                                              |
| Store          | `kathmandu-studio` sample store                                                                                                                                                                                                                                                                                       |
| Products       | `products` array loop → `product.upsert` → per color × storage `productVariant.upsert` (sku `` `${slug}-${ci}-${si}` ``, paisa price `(base + storageIndex × 20000/10000) × 100`) → `inventoryStock` create-if-missing → `inventoryLedger.create` (`type: 'DEVELOPMENT_SEED'`, `quantity: 8`, `reference: 'seed-v2'`) |
| Trade-in rules | per `[model, baseValue]` → `tradeInRule.upsert`                                                                                                                                                                                                                                                                       |
| CMS pages      | `pages` array → published `cMSPage.upsert`s                                                                                                                                                                                                                                                                           |
| Roles          | 9 roles: Super Admin (`['*']`), Content Manager, Technician, Repair Manager, Quality Inspector, Procurement Officer, Procurement Approver, Finance, Inventory Manager                                                                                                                                                 |
| Admin user     | only when `ADMIN_PASSWORD` is set: `admin@iphonebooking.local` (override `ADMIN_EMAIL`), bcrypt cost 12, Super Admin role                                                                                                                                                                                             |

Closes with `$disconnect()` and the honesty log: _"Development catalog seeded. No customer orders
or dashboard metrics were fabricated."_ — run via `npm run db:seed` (`tsx prisma/seed.ts`).

### 8.2 `scripts/`

- `build-client.mjs` — pins `process.env.NODE_ENV = 'production'` **before** importing vite (a
  local API `.env` must not produce dev client assets in release builds), then `build()`.
- `check-pwa.mjs` — Playwright Chromium (`channel: 'chrome'`) production PWA check against
  `PWA_TEST_ORIGIN` (default `http://localhost:4101`); throws unless the origin host is
  `localhost`/`127.0.0.1`.

### 8.3 `tests/` (vitest + Playwright)

| Kind        | Files                       | Covers                                                       |
| ----------- | --------------------------- | ------------------------------------------------------------ |
| Unit        | `shop-sync.test.ts`         | anonymous selection migration                                |
| Unit        | `valuation.test.ts`         | trade-in valuation in integer paisa                          |
| Integration | `device-os.test.ts`         | device OS domain integrity                                   |
| Integration | `lifecycle.test.ts`         | connected device lifecycle & authorization                   |
| Integration | `repair-assignment.test.ts` | verified repair technician assignment (mocked deps)          |
| E2E         | `e2e/*.spec.ts` (5)         | account-sync, appearance, device-os, mobile-home, storefront |

Run: `npm test` (vitest run), `npm run test:e2e` (playwright), `npm run test:pwa` (§8.2).

### 8.4 `package.json` scripts

| Script                                   | Command / behavior                                                                                       |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `dev`                                    | `concurrently -k` → `tsx watch server/index.ts` + `vite --host 0.0.0.0`                                  |
| `dev:client` / `dev:server`              | vite only / `tsx watch server/index.ts`                                                                  |
| `build`                                  | `tsc --noEmit` → `build:client` → `tsc -p tsconfig.server.json`                                          |
| `typecheck`                              | `tsc --noEmit`                                                                                           |
| `test` / `test:e2e` / `test:pwa`         | `vitest run` / `playwright test` / `node scripts/check-pwa.mjs`                                          |
| `start` / `start:worker`                 | `node dist-server/index.js` / `node dist-server/worker.js`                                               |
| `worker`                                 | `tsx server/worker.ts` (foreground worker, §1.3)                                                         |
| `db:generate` / `db:migrate` / `db:seed` | `prisma generate` / `prisma migrate deploy` / `tsx prisma/seed.ts`                                       |
| `format` / `lint`                        | prettier `--write` / `--check` over `src server scripts prisma/seed.ts tests *.ts *.json docs README.md` |
| `check`                                  | `lint && typecheck && test && build` — the full local gate                                               |

## 9. API error-code catalog (77 codes)

Every distinct `AppError(status, code, …)` string across `server/`, plus the codes emitted by the
fixed guards (`requireUser`, `permit`, `owned`, CSRF middleware, error mapper — §1.1/§1.2). Wire
shape: `{ success: false, error: { code, message, requestId } }`.

**400 Bad Request** — `INVALID_JSON`

**401 Unauthorized** — `INVALID_CREDENTIALS`, `INVALID_PASSWORD`, `SIGN_IN_REQUIRED`

**403 Forbidden** — `ACCESS_DENIED`, `CSRF_REJECTED`, `ORIGIN_REJECTED`, `PRIVILEGE_ESCALATION`

**404 Not Found** — `NOT_FOUND`

**409 Conflict (49)** — `ACCOUNT_CHANGED`, `ACCOUNT_EXISTS`, `ALLOCATION_INVALID`,
`ALLOCATION_MISMATCH`, `ALREADY_ALLOCATED`, `ALREADY_ASSIGNED`, `ALREADY_INSPECTED`,
`ALREADY_SUBMITTED`, `ASSIGNMENT_CHANGED`, `ASSIGNMENT_STAGE_LOCKED`, `CONTENT_CHANGED`,
`CREDIT_EXCEEDS_ORDER`, `DEVICE_LINK_REQUIRED`, `DUPLICATE_RECORD`,
`INDEPENDENT_APPROVER_REQUIRED`, `INDEPENDENT_QC_REQUIRED`, `INVALID_TRANSITION`,
`LEGACY_ASSIGNMENT_REVIEW_REQUIRED`, `LOCATION_REQUIRED`, `NEGATIVE_STOCK`,
`ORDER_ALREADY_DECIDED`, `ORDER_CLOSED`, `OVERPAYMENT`, `OWNERSHIP_REQUIRED`, `PART_COST_REQUIRED`,
`PART_OUT_OF_STOCK`, `PAYMENT_REQUIRED`, `PRODUCT_OUT_OF_STOCK`, `PRODUCT_UNAVAILABLE`,
`PROTECTED_ROLE`, `PURCHASE_NOT_APPROVED`, `PURCHASE_QUANTITY_MISMATCH`, `QC_REQUIRED`,
`QC_STAGE_REQUIRED`, `QUOTE_ALREADY_DECIDED`, `QUOTE_NOT_ALLOWED`, `QUOTE_NOT_READY`,
`RECEIPT_ALREADY_INSPECTED`, `RECEIPT_REQUIRED`, `REFUND_UNAVAILABLE`, `REPAIR_NOT_APPROVED`,
`RESERVATION_EXPIRED`, `RETRY_TRANSACTION`, `SELF_ROLE_CHANGE`, `SHOP_STATE_CHANGED`,
`STATUS_CHANGED`, `TRADE_IN_NOT_APPROVED`, `UNIT_LOCATION_MISMATCH`, `VARIANT_MISMATCH`

**422 Unprocessable (13)** — `DUPLICATE_ITEM`, `DUPLICATE_LINE`, `INCOMPLETE_QC`,
`INVALID_CONFIGURATION`, `NAME_REQUIRED`, `ORDER_VALUE_LIMIT`, `PAST_APPOINTMENT`, `QUANTITY_LIMIT`,
`SAVED_ITEM_UNAVAILABLE`, `STOCK_LOCATION_REQUIRED`, `TECHNICIAN_NOT_ELIGIBLE`, `VALIDATION_ERROR`,
`VALUE_LIMIT`

**429 Rate limited** — `AUTH_RATE_LIMITED`, `RATE_LIMITED`

**5xx** — `INTERNAL_ERROR` (500), `WORKFLOW_NOT_IMPLEMENTED` (501 — legacy scaffolds §3.8),
`PAYMENT_NOT_CONFIGURED` + `PROVIDER_NOT_CONFIGURED` (503 — fail-closed integrations, §10.3)

Client rule: branch on `code`, never on the message (messages are not localized);
`RETRY_TRANSACTION`/`DUPLICATE_RECORD` are safe to retry because writes carry idempotency keys
(§10.2), everything else 5xx fails closed.

`Status` (status pill); `cn()` (clsx + tailwind-merge) in `utils/cn`.

## 10. Cross-cutting invariants (both tiers)

1. **Money is integer paisa end-to-end**; the client never computes totals — the server derives
   `total`/`dueNow`, the client only formats (`money()`).
2. **Idempotency & concurrency**: checkout UUID `idempotencyKey`; unique ledger `eventKey`;
   optimistic `shopRevision` claim; `updatedAt` content locking; conditional `updateMany` claims
   for stock, units, statuses, and jobs — every race resolves to a typed 409 the client can render.
3. **Fail-closed integrations**: payments (`UnconfiguredProvider` → 503), device risk
   (`UNKNOWN`), legacy scaffolds (501) — the API never pretends an unconfigured provider worked.
4. **Ownership everywhere**: user-scoped queries filter by `req.user!.id` or `owned()`; guest
   data is reachable only via `trackingHash` (order tracking, claim-order).
5. **Least-privilege RBAC**: 34-permission catalog plus `'*'`; `assertGrantable` blocks
   escalation; protected roles can't be edited here; role changes revoke member sessions.
6. **Append-only audit**: `OrderMoneyEntry` and `AuditLog` rows are written, never updated.
7. **Device privacy**: serials stored as sha256 digests + last-4 only; the passport is a read
   projection, never an editable copy.

See also: [architecture.md](./architecture.md) (stack + conventions), [api.md](./api.md) (payload
shapes), [operations.md](./operations.md) (runbooks), [verification.md](./verification.md)
(checklists), [concept-mapping.md](./concept-mapping.md) (V1 → V2 mapping), and
`iphonebooking-config/STRUCTURES.md` (V1 monorepo structures this app succeeds).
