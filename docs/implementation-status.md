# Implementation status against the master specification

This file is intentionally explicit: **the full 90-section Production V2 specification is not complete**. See [Device OS progress](device-os-progress.md) for subsequent V3 work that supersedes parts of the list below, and [all 203 requirements](requirements-register.md) for combined scope. The repository contains real database-backed workflows and a polished local UI, not a claim that every enterprise feature is launch-ready.

## Implemented and exercised

| Area              | Current implementation                                                                                                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation        | React/Vite/TypeScript, Express, Prisma/PostgreSQL, TanStack Query, Zustand, migrations, compiled Node output                                                                             |
| Design            | Responsive shell, original generated assets, token system, product cards, selectors, dialogs, tables, forms, empty/error/loading states, reduced-motion support                          |
| Catalog           | Database products/families/variants/specification JSON, published visibility, category pages, prices, configurations, stock, search by name/SKU, URL filters                             |
| Cart/checkout     | Anonymous persistence, authenticated cart merge/storage, guest checkout, Nepal address fields, authoritative integer prices, temporary reservations, policy acceptance snapshot          |
| Booking/ownership | Deposit calculation, private confirmation key, tracking, guest claim, staff payment, allocation, staged fulfillment, serial masking, My Devices and warranty record                      |
| Repairs           | Intake, ownership linkage, stage validation, diagnosis/quotation, parts/labor totals, immutable customer approval, history                                                               |
| Trade-in/exchange | Database valuation rules, condition/battery/function factors, inspection, accepted credit, unique application to an order, linked prior device                                           |
| Accounts/support  | Login/registration, secure sessions, password change, session revocation, profile, addresses, tickets, staff-only notes, in-app notifications                                            |
| Admin             | Real metrics, paginated records, selected creates/edits, price and inventory actions, collection/allocation/fulfillment, repair quotes, inspection, CMS, permission gates, audit records |
| CMS               | Published pages and structured hero/text/FAQ/CTA blocks; homepage hero text configurable; campaigns use content routes                                                                   |
| Operations        | Scheduled reservation cleanup, database job claims, retries/backoff, lease recovery, dead-letter states, API health and structured logs                                                  |
| SEO/PWA           | Production metadata injection, product/organization JSON-LD, sitemap, robots, noindex private/filter pages, manifest and safe static offline fallback                                    |
| Verification      | API lifecycle and security integration tests, valuation unit tests, browser journeys, responsive checks, homepage automated accessibility checks, dependency scan                        |

## Partial; additional implementation required

- **Product assets:** the generated catalog is illustrative. Production image/video galleries, per-color photography, upload/crop/media ordering, arbitrary configuration schemas beyond the current storage/color selector, and accessible gallery controls need completion.
- **CMS:** only the homepage hero is currently CMS-driven; other homepage copy/layout, navigation, mega menus, footer, reusable campaign layouts, policy version publishing, and SEO override management need further work. The admin block editor currently accepts validated JSON, not a visual drag-and-drop builder.
- **Search:** name/SKU search works. Cross-domain instant search, synonyms, typo tolerance, recent searches, advanced price/generation/condition filters and search indexing are not implemented.
- **Wishlist:** account-scoped persistence, guest migration, and conflict recovery work. Price/stock notification preferences remain open.
- **Inventory:** location-based quantities and a ledger exist. Physical serials do not yet track warehouse/store transfers. Supplier purchasing now supports approval and serialized receiving/QC; supplier exceptions, region/condition dimensions, incoming/damaged/repair stock, dual IMEI/EID protection, reconciliation reports, and import/export jobs need completion.
- **Pre-booking:** reservation/deposit/allocation workflows exist. Campaign date windows, queue priority, online/store quotas, preference fallback, QR confirmations, cancellation/refund policy automation, and configurable reservation durations are not finished.
- **Checkout:** no shipping-rate engine, saved-address selector, coupon/bundle/provider offers, tax engine, installment calculator, dealer pricing, or lost-response guest receipt recovery. Reservations use unique idempotency keys but do not replay the original response.
- **Repair:** no media uploads, technician directory/assignment permissions, tax/discount lines, technician-private notes, payment collection, shipping integration, or downloadable formal quotations.
- **Trade-in/buyback:** model/condition/battery/function values work; detailed diagnostic questionnaires, media, serial fraud detection, storage/age/market-demand factors, courier appointments, multiple-device offers, and buyback payouts remain open.
- **Admin:** no full supplier/distributor/retailer/warehouse modules, bulk actions/saved views/column editor, date-filtered revenue reports/funnels, import preview/XLSX processing, customer data exports, or complete settings UI. Some modules are read-only records by design.
- **Account/privacy:** no email/phone verification, reset-by-email, OTP/MFA/passkeys/social login, data deletion/export workflow, preference center, or complete retention automation.
- **Money/refunds:** store-payment recording and refund request intake exist. Provider payment/refund execution, external bank/gateway reconciliation, return logistics, partial refunds, tax invoices, fraud review, promotions, and refund ledger accounting are not complete.
- **Notifications:** in-app updates work. Email, SMS, push delivery and subscriber campaigns are not configured. The current job handler is reservation cleanup only.
- **Internationalization:** a translation dictionary boundary exists, but most UI copy still needs extraction and a reviewed Nepali translation. Multi-currency settlement is not implemented.
- **SEO/performance/accessibility:** metadata is server-generated; page bodies are client-rendered. No certified WCAG conformance, Core Web Vitals field evidence, load test, production image CDN, or full crawler/rendering validation has been completed.

## Requires external setup/review before launch

1. Verified commercial catalog, real inventory, store/contact details, warranty terms, tax treatment, approved policies, and licensed/approved product media.
2. Payment merchant credentials **and implementation/verification** of provider adapters; credentials alone do not finish payment integration.
3. Email/SMS/push providers, object storage, secrets manager, HTTPS hosting, domain/DNS, CDN, shared rate limits, and centralized monitoring.
4. Production/staging databases, backup/PITR policy, restore drill, migration review, acceptance testing, and security review.
5. Business decisions for queues, reservation expiry, shipping, tax, returns, service warranties, trade-in inspection, buyback payout, and roles.

No real payment is simulated. No sample stock or generated product illustration should be presented as verified commercial data. The development footer and draft-policy labels remain visible until the underlying business data is replaced and launch review is complete.
