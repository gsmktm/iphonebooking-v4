# iPhoneBooking V4 — route-by-route redesign inventory

**Date:** 2026-11-27  
**Source baseline:** `main@4c1815cb208923c6188637d93589c598d7945f76`  
**Implementation branch:** `design/all-pages-2026-11-27`  
**Authoritative source:** `apps/web/src/app/App.tsx` and `apps/web/src/pages/Admin.tsx`

## What "complete" means

Every template must render its correct backend data and distinct content, support desktop/mobile, preserve permissions and transaction integrity, and have verified regression coverage. Importing a stylesheet does not count as a page-specific review, and creating an E2E test does not count as running it.

**Current status:** Shared V4 CSS refinement added to `apps/web/src/styles/v4-pages.css`; all non-home storefront routes receive an accessible `RouteWayfinding` component from the shared shell. Protected admin has a mobile navigation fix. Detailed per-route browser verification and feature-specific visual review are **NOT RUN**.

### Route inventory

| Area                | Routes / route families                                                                                   | Primary component                         | Shared visual layer                                         | Per-route browser QA |
| ------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------- | -------------------- |
| Home                | `/`                                                                                                       | `Home.tsx` and home features              | Existing premium homepage; shared global components updated | NOT RUN              |
| Catalog             | `/store`, `/catalog`, `/search`, `/deals`, `/prebook`, `/wishlist`                                        | `Catalog.tsx`                             | V4 CSS + wayfinding                                         | NOT RUN              |
| Category            | `/iphone`                                                                                                 | `IPhone.tsx`                              | V4 CSS + wayfinding                                         | NOT RUN              |
| Other categories    | `/mac`, `/ipad`, `/watch`, `/airpods`, `/accessories`, `/vision`, `/home`                                 | `Category.tsx` / `Catalog.tsx`            | V4 CSS + wayfinding                                         | NOT RUN              |
| Product details     | `/products/:slug`, `/iphone/:slug`                                                                        | `Product.tsx`                             | V4 CSS + wayfinding                                         | NOT RUN              |
| Cart / compare      | `/cart`, `/compare`                                                                                       | `Commerce.tsx`                            | V4 CSS + wayfinding                                         | NOT RUN              |
| Checkout            | `/checkout`                                                                                               | `Commerce.tsx`                            | V4 CSS + wayfinding                                         | NOT RUN              |
| Checkout outcome    | `/confirmation`, `/checkout/success`, `/checkout/failure`                                                 | `Confirmation.tsx`, `PaymentFailure.tsx`  | V4 CSS + wayfinding                                         | NOT RUN              |
| Order tracking      | `/track`                                                                                                  | `Commerce.tsx`                            | V4 CSS + wayfinding                                         | NOT RUN              |
| Trade-in            | `/trade-in`, `/exchange`, `/sell-device`                                                                  | `Services.tsx`                            | V4 CSS + wayfinding                                         | NOT RUN              |
| Repairs             | `/repair`, `/repair/:ticketId`                                                                            | `Services.tsx`, `RepairTracking.tsx`      | V4 CSS + wayfinding                                         | NOT RUN              |
| Account access      | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`                             | `Account.tsx`, `account/AuthRecovery.tsx` | V4 CSS + wayfinding                                         | NOT RUN              |
| Account sections    | `/account`, `/account/:section`                                                                           | `Account.tsx`, account features           | V4 CSS + wayfinding                                         | NOT RUN              |
| Device passport     | `/account/devices/:id`                                                                                    | `account/Passport.tsx`                    | V4 CSS + wayfinding                                         | NOT RUN              |
| Stores              | `/stores`, `/stores/:slug`                                                                                | `Information.tsx`                         | V4 CSS + wayfinding                                         | NOT RUN              |
| Retailers           | `/retailer-network`, `/retailer`                                                                          | `Retailer.tsx`                            | V4 CSS + wayfinding                                         | NOT RUN              |
| Device intelligence | `/world-price-map`, `/imei-check`                                                                         | `Intelligence.tsx`                        | V4 CSS + wayfinding                                         | NOT RUN              |
| Editorial           | `/blog`, `/blog/:slug`, `/news`, `/news/:slug`                                                            | `Information.tsx`                         | V4 CSS + wayfinding                                         | NOT RUN              |
| Help / policies     | `/support`, `/support/:slug`, `/policies/:slug`, `/campaign/:slug`, `/faq`                                | `Information.tsx`                         | V4 CSS + wayfinding                                         | NOT RUN              |
| Company             | `/about`, `/about-us`, `/contact-us`, `/careers`, `/press-room`, `/history`, `/cookies`, `/accessibility` | `Information.tsx`                         | V4 CSS + wayfinding                                         | NOT RUN              |
| Admin dashboard     | `/admin`                                                                                                  | `Admin.tsx`, `admin/Dashboard.tsx`        | V4 CSS + mobile menu fix                                    | NOT RUN              |
| Admin resources     | `/admin/:resource`                                                                                        | `Admin.tsx`, `admin/ResourcePage.tsx`     | V4 CSS + mobile menu fix                                    | NOT RUN              |
| Not found           | unmatched `*`                                                                                             | `Information.tsx`                         | V4 CSS + wayfinding                                         | NOT RUN              |

### Account sub-sections that must be tested

`/account/profile`, `/account/orders`, `/account/devices`, `/account/repairs`, `/account/trade-ins`, `/account/addresses`, `/account/notifications`, `/account/security`, `/account/tickets`, and any implemented settings section.

### Administration sub-sections that must be tested with appropriate scoped permissions

| Group            | Resource keys                                                                                                                                                                                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Commerce         | `orders`, `bookings`, `products`, `categories`, `variants`, `payments`, `order-ledger`, `reconciliation`, `refunds`                                                                                                                                                  |
| Device lifecycle | `inventory`, `inventory-ledger`, `units`, `repairs`, `trade-ins`, `valuation-rules`, `device-identity`, `device-event`, `device-risk-check`, `parts`, `part-movements`, `trade-in-quote`, `repair-qc`, `repair-warranty`, `suppliers`, `purchase-orders`, `receipts` |
| People / content | `customers`, `stores`, `retailer-applications`, `price-intelligence`, `content`, `reviews`, `tickets`, `notifications`, `subscribers`                                                                                                                                |
| System           | `roles`, `audit-logs`, `jobs`                                                                                                                                                                                                                                        |

Some resource keys may be intentionally disabled depending on permissions and implementation state. A schema or UI entry does not prove a complete backend workflow.

### Aliases / redirects to verify, not count as standalone page designs

Legacy redirects include `/iphone-18`, `/pre-order`, `/compare-iphones`, `/emi-options`, `/track-order`, `/repair-booking`, `/dashboard`, `/preorders`, `/privacy`, `/terms`, `/returns`, `/refund-policy`, `/warranty`, `/shipping` and admin compatibility aliases. Check the remaining `App.tsx` redirect lists before publishing a final count.

## Completed on this implementation branch

- Added `apps/web/src/styles/v4-pages.css`: coherent page intros, section spacing, category navigation, product cards, service forms, content pages, account surfaces and admin panels using the existing semantic palette.
- Imported the new CSS last in `apps/web/src/main.tsx`, keeping all existing CSS files for compatibility.
- Added `apps/web/src/components/RouteWayfinding.tsx` and integrated it in `Shell.tsx` for context-specific customer navigation.
- Improved compact admin navigation: Escape to close, a clickable scrim, expanded-state attributes and hidden closed-sidebar focus targets.
- Added `tests/e2e/v4-pages.spec.ts` for route context, mobile/desktop overflow and keyboard navigation.

## Not yet verified / outstanding

- **Browser visual QA:** NOT RUN. Requires running application, test Postgres and Chrome.
- **Lint, typecheck, unit tests and production build:** NOT RUN on this branch.
- **Per-template visual comparisons and business journey regression tests:** NOT RUN.
- **Production deployment, payment-provider tests and migration:** NOT PERFORMED.
- **Uniquely tailored per-template redesigns beyond shared styling:** INCOMPLETE.
- **Live content, imagery, prices, inventory, CMS and translation review:** NOT PERFORMED.

## Safe verification sequence

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm skills:verify
pnpm lint
pnpm typecheck
pnpm test
pnpm build
# Configure isolated PostgreSQL test database and a local Chrome browser first:
pnpm db:test:migrate
pnpm test:e2e
```

Use `DEPLOYMENT.md` and `SECURITY.md` before any production deployment. No production write is authorized by this design inventory.
