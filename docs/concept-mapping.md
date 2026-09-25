# Concept & function mapping — iphonebooking-config → this app

> Companion to `STRUCTURES.md` in `iphonebooking-config`. That repo is the original 3-app
> monorepo (web `:5173` / admin `:5174` / retailer `:5175` + Express API `:4002`). This repo
> (`iphone-booking`, "iPhoneBooking V2") is a separate, single-app rebuild: React 19 + strict TS +
> Vite + Tailwind (storefront + `/admin`) and Express 5 + Prisma 6 + Postgres, API `:4000`.
>
> This document maps the **concepts** (design system) and **functions/flows** from
> `STRUCTURES.md` onto this codebase's actual architecture so the original product intent can be
> carried across without cargo-culting a different stack. Nothing here is implemented by this doc;
> it is a reference for future work.

## 1. Two systems at a glance

| Axis      | iphonebooking-config (source)                                            | this repo (V2)                                                                                               |
| --------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Frontends | 3 apps: web / admin / retailer (React 18, JS)                            | 1 app, 2 surfaces: store `/` + admin `/admin` (React 19, TS)                                                 |
| API       | Express 4 ESM, JS controllers                                            | Express 5, TS, Zod-validated route modules                                                                   |
| ORM / DB  | Prisma 5 + Supabase Postgres                                             | Prisma 6.19 + Postgres (migration-owned SQL checks)                                                          |
| Auth      | Bearer JWT 15m + rotating refresh 7d in localStorage                     | Opaque session token, SHA-256 hash, HttpOnly SameSite=Lax cookie (7d)                                        |
| Envelope  | `{success,data,message,meta}` / `{success,error:{code,message,details}}` | `{error:{code,message,requestId}}` on failure; data returned directly                                        |
| Money     | integer cents / Prisma Decimal                                           | integer NPR **paisa** server-side; browser totals are estimates                                              |
| Payments  | live Khalti/eSewa/Stripe verified server-side                            | `PaymentProvider` → `UnconfiguredProvider` fails closed 503; audited **store payment** is the human workflow |

**Rule of thumb:** where the two disagree on _correctness_ (money, stock, auth, payment
verification), keep this repo's behaviour — it is the stricter, tested implementation. Where they
disagree on _concept, naming, or UX intent_, `STRUCTURES.md` is the reference.

## 2. Design concept — "Diamond / Shiva-Shakti" → this app

Source concept (STRUCTURES §2): black void + champagne gold + cosmic blue; serif display + condensed
UI + mono metadata; pure-CSS sprites; "luxury vault / command deck".

This repo's design has **already diverged deliberately** — see `docs/design.md`. Current state:

- `src/styles/tokens.css` — warm neutral light theme: `--ink #232522`, `--muted`, `--line`, `--paper #f6f5f2`, `--crimson #a43d39`, `--navy #18272b`, `--radius .75rem`, `--ease cubic-bezier(.2,.8,.2,1)`, system font stack.
- `docs/design.md` "Navy and gold homepage" (22 Sep 2026): midnight `#071014`, panel `#101b20`, gold `#dec28d`, muted `#b9c3c7` — a _dark_ campaign palette already approved, sourced from a concept screenshot.
- Tailwind 4 via `@tailwindcss/vite`, utilities co-located with campaign CSS in `src/styles/luxe.css`; `cn()` (`src/utils/cn.ts`, clsx + tailwind-merge) for conditional classes.

**Mapping if the Diamond look is wanted here:**

| Diamond token                                       | value                                      | maps to                                                                                |
| --------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------- |
| `--void --v1..v5`                                   | `#000 → #1A1A2E`                           | dark surface scale; closest existing = `--navy #18272b` / homepage `#071014`–`#101b20` |
| `--shakti-gold/bright/fire`                         | `#C9A84C / #E8C96A / #D4601A`              | homepage gold `#dec28d`; adopt as accent var in `tokens.css`                           |
| `--shakti-cosmic`                                   | `#4A7AA8`                                  | focus ring already `#526a8c` — near-identical                                          |
| `--text-1/2/3`                                      | `#F0F0F8 / #9090A8 / #505068`              | inverse of current `--ink/--muted` (light-on-dark)                                     |
| `--f-disp / --f-ui / --f-mono`                      | Cormorant Garamond / Rajdhani / Space Mono | currently system font; would need webfonts in `index.html`                             |
| `diamond-border`, glass `rgba(255,255,255,.025–.1)` |                                            | add as Tailwind theme tokens alongside `luxe.css`                                      |
| `.adm-gem`, `.premium-product-card` sprites         | pure CSS                                   | port as components, not images                                                         |

**Caution:** `docs/design.md` records the current light/warm direction as an intentional, tested
choice (WCAG axe pass, reduced-motion, 7 breakpoints). Flipping to the dark Diamond theme is a
product decision, not a like-for-like port — update `tokens.css` + `luxe.css` + `docs/design.md`
together, and re-run `npm run test:e2e` (axe + layout) after.

## 3. Web pattern functions → V2 equivalents

| STRUCTURES §3a function (config)                                            | purpose              | equivalent here                                                                                                                                                                    |
| --------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/apiClient.js` (axios, Bearer inject, 401 clear)                        | HTTP + auth header   | `src/services/api.ts` → `api()/post()` fetch wrapper; cookie auth via `credentials:'same-origin'`, `X-Requested-With: iPhoneBooking`; throws typed `ApiError(code, requestId)`     |
| `lib/api.js` react-query hooks                                              | server state         | `@tanstack/react-query` v5 + typed hooks over `src/services/api.ts`                                                                                                                |
| `getProductActions.js` (single CTA truth: Buy/PreOrder/EMI/Compare/TradeIn) | decide product CTAs  | closest = `ProductCard.tsx` / `Product.tsx` configurator + `Commerce.tsx`; **no single extracted helper yet** — a real gap worth porting as one `getProductActions`-style function |
| `utils/variantPricing.js` `buildVariantPricing`                             | variant → price      | server: `ProductVariant.price/deposit` (paisa); client shows estimates; `server/services/orders.ts createOrder` recomputes at checkout                                             |
| `utils/productContext.js` (URL + sessionStorage funnel ctx)                 | carry source context | filters live in **URL params** (`docs/architecture.md`); no funnel ctx — gap if attribution is needed                                                                              |
| `stores/appStore.js` (zustand cart/theme)                                   | client state         | `src/store/shop.ts` (`useShop`, persist `iphonebooking-shop-v2`, cart/compare/wishlist + `revision`/`dirty` for server sync)                                                       |
| `utils/thumb()` image helper                                                | asset URLs           | local `public/images/*`, sprite-cell CSS for catalog; no remote deps                                                                                                               |
| `injectNPR` client currency format                                          | price display        | `money()` in `src/services/api.ts` (paisa → `NPR …`)                                                                                                                               |

## 4. Flows → V2 flows

| STRUCTURES §5 flow              | source behaviour                                                      | V2 equivalent (authoritative)                                                                                                                                                                                                                         |
| ------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Browse→buy→pay→fulfill       | reserve tx, PENDING_PAYMENT, gateway initiate→verify→PAID, idempotent | `orders.ts createOrder` (serializable tx: −available/+reserved, ledger append) → staff **store payment** `money-ledger.ts recordStorePayment` (perm `payment.collect`, unique receipt ref) → `BookingAllocation` → handover via `device-lifecycle.ts` |
| payment expiry                  | release on expiry                                                     | `orders.ts expireReservations()` via DB worker (`server/worker.ts`, 24h, conditional claims/retries/leases/DLQ)                                                                                                                                       |
| 2. Pre-order → convert          | PreOrder queue → convert-to-order                                     | `Booking` + `BookingAllocation`: deposit → allocation-ready → balance before handover                                                                                                                                                                 |
| 3. Trade-in estimate → credit   | factor multiply (battery/screen/body/bonuses)                         | `valuation.ts valueDevice(rule, condition, battery, functional)` → inspected `TradeIn`/`TradeInQuote` → checkout credit (unique order↔trade-in prevents double spend)                                                                                 |
| 4. Repair request → states      | RPR-* + status logs + QC                                              | `Repair` + `RepairQuote` (partial unique index = one pending) + `RepairAssignment`/`RepairStatusHistory`/`RepairQC`/`RepairWarranty`; stage machine in `services/repair-quality.ts`, `permissions.ts`                                                 |
| 5. IMEI trust check             | DeviceRegistry stolen? → ImeiCheck                                    | `DeviceIdentity` (irreversible hash, last-4 shown) + `DeviceRiskCheck` + `DeviceEvent`; dual IMEI/EID encryption still open scope                                                                                                                     |
| 6. Retailer verify → commission | Retailer → Commission                                                 | `Retailer` + `RetailerSettlement` + `FinancialLedger`/`ReconciliationMismatch`; procurement approved by a different staff member                                                                                                                      |
| 7. CMS/SEO/theme → render       | admin writes → public reads                                           | `CMSPage` + `services/seo.ts` (canonical/OG/JSON-LD injected into Vite shell; DB-driven sitemap; account/admin/filter noindex)                                                                                                                        |
| 8. Import/sync/audit            | Evostore import + dual-DB mirror + audit                              | `AuditLog` on admin writes; `SyncChange`/`IntegrationConfig`/`WebhookLog`/`OutboxMessage` exist (partly schema-only); no Evostore importer here                                                                                                       |

## 5. Database — 40 config models → V2 schema (~120 models)

V2's schema is a superset in breadth (Device OS, procurement, POS, workflow, forecasting) but
narrower in some sell-side detail. Key correspondences:

| Config model(s)                                                                   | V2 equivalent                                                                                                                                               | Note                                                                                                  |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `User`/`UserSession`/`UserAddress`                                                | `User`/`Role`/`UserSession`/`Address`                                                                                                                       | V2 adds DB roles/permissions (`role.manage`) vs config's fixed enum roles                             |
| `Currency`/`Country`                                                              | —                                                                                                                                                           | V2 is single-currency NPR paisa; country fields inlined (Nepal address fields)                        |
| `Category`/`Product`/`ProductVariant`/`ProductPrice`/`ProductImage`/`ProductSpec` | `Category`/`Product`/`ProductVariant`/`AccessoryCompatibility`                                                                                              | prices are columns on `ProductVariant`; specs seeded on product; images are local assets, not a table |
| `Inventory`/`InventoryTransaction`                                                | `InventoryStock`/`InventoryLedger`/`InventoryUnit`/`InventoryBin`                                                                                           | V2 adds location-specific stock, append-only ledger, physical units + QC states                       |
| `Order`/`OrderItem`/`Payment`/`PaymentEvent`/`PaymentGateway`                     | `Order`/`OrderItem`/`OrderStatusHistory`/`Payment`/`Refund`/`WebhookEvent`/`OrderMoneyEntry`                                                                | V2 gateway = single unconfigured provider; `OrderMoneyEntry` = immutable money ledger                 |
| `EmiPlan`                                                                         | `FinancingApplication`                                                                                                                                      | config has retail EMI plans; V2 has financing applications (schema-level)                             |
| `PreOrder`/`LaunchConfig`…                                                        | `Booking`/`BookingAllocation`/`LaunchConfig`/`AllocationRule`/`WaitlistEntry`                                                                               | deposit → allocate → handover                                                                         |
| `Repair*` family                                                                  | `Repair`/`RepairQuote`/`RepairAssignment`/`RepairStatusHistory`/`RepairBOM`/`RepairQC`/`RepairWarranty`                                                     | V2 adds parts BOM, required QC, service warranties                                                    |
| `TradeInValuation`/`TradeInRequest`                                               | `TradeInRule`/`TradeIn`/`TradeInQuote`/`ConditionSnapshot`/`ConditionEvidence`                                                                              | V2 valuation = `valuation.ts` + versioned offers                                                      |
| `DeviceRegistry`/`ImeiCheck`                                                      | `DeviceIdentity`/`IdentityLink`/`DeviceEvent`/`DeviceRiskCheck`/`DevicePassport`                                                                            | hashed identity, owner-only passport                                                                  |
| `Retailer`/`RetailerDocument`/`Commission`                                        | `Retailer`/`RetailerSettlement`                                                                                                                             | + `FinancialLedger`, `ReconciliationMismatch`                                                         |
| `WalletTransaction`                                                               | `LoyaltyLedgerEntry`/`Referral`/`FinancialLedger`                                                                                                           | config customer wallet vs V2 loyalty + internal ledger                                                |
| `Notification(Template)`/`FormSubmission`                                         | `Notification`/`SupportTicket`/`TicketMessage`/`Subscriber`/`OutboxMessage`                                                                                 | threaded support replaces form-submission inbox                                                       |
| `PageContent`/`CmsBanner`/`Page`/`SeoSetting`/`AppSetting`                        | `CMSPage` + `server/services/seo.ts`                                                                                                                        | SEO computed at render, not a settings table                                                          |
| `AuditLog`                                                                        | `AuditLog`                                                                                                                                                  | both, on admin/staff writes                                                                           |
| —                                                                                 | Device OS / procurement / POS / ops: `PurchaseOrder`, `GoodsReceivedNote`, `POSSession`, `WorkflowDefinition`, `SLAConfig`, `FeatureFlag`, `Incident`, etc. | V2-only scope, no config counterpart                                                                  |

Config-only concepts with **no V2 counterpart yet**: currency/country tables, public payment
gateway admin (secrets AES), EMI plans, Evostore import, dual-DB `dbSync`, wallet, banner/theme
admin, contact/return/distributor/career forms, retailer portal as a separate app.

## 6. Porting recommendations (priority order)

1. **`getProductActions`-style single CTA helper** — pure function, low risk, removes CTA logic
   scattered across `ProductCard`/`Product`/`Commerce`.
2. **Funnel context (`productContext`)** — URL-param based (fits V2's URL-state rule; avoid
   sessionStorage since V2 deliberately keeps credentials/state policy tight).
3. **Diamond theme as an optional token set** — add gold/void variables to `tokens.css` +
   Tailwind theme, keep light theme default; gate the campaign look; re-run axe/layout e2e.
4. **Payment gateway layer** — V2 already defines `PaymentProvider` (create/verify/refund/webhook).
   A Khalti/eSewa adapter plugs in behind it without changing checkout; keep V2's "webhooks can't
   mark paid" and idempotency invariants, borrowing config's `PaymentEvent`-style audit rows
   (`WebhookEvent`/`OrderMoneyEntry` already exist).
5. **Do not port**: localStorage tokens, JWT-in-localStorage auth, Decimal money, console logging,
   image upload-to-local-disk — V2's cookie sessions, integer paisa, structured errors and
   migration-owned checks are strictly better.

## References

- Source of concepts/functions: `iphonebooking-config/STRUCTURES.md`
- This app's own docs: `docs/architecture.md`, `docs/api.md`, `docs/design.md`,
  `docs/implementation-status.md`, `docs/device-os-progress.md`
