# Local verification — 22 September 2026

> Historical implementation note. The 6 October 2026 refresh is documented in [ARCHITECTURE.md](../ARCHITECTURE.md), [API.md](../API.md), [DEPLOYMENT.md](../DEPLOYMENT.md) and [TESTING.md](../TESTING.md). Those files supersede older payment/mail, homepage, build-command and verification claims below.

These results apply to the local implementation. The complete V2/V3 specification remains unfinished; schema-only domains are not completed workflows.

| Check                                    | Result                                                 |
| ---------------------------------------- | ------------------------------------------------------ |
| Prisma schema validation                 | Passed                                                 |
| Formatting and strict TypeScript         | Passed                                                 |
| Unit and API integration tests           | 36 passed across 5 test files                          |
| Playwright browser tests                 | 12 journeys passed across the suite and targeted rerun |
| Client and server production compilation | Passed                                                 |
| npm dependency audit                     | 0 reported vulnerabilities                             |

The API suite covers authoritative checkout pricing, concurrent inventory reservations, session and permission boundaries, private tracking, staff receipt recording, allocation, location-bound serial assignment, ownership, owner-only passports, repair quotes and approvals, compatible part consumption, fresh QC after rework, repair warranty, versioned trade-in offers, immutable financial/device/service records, internal reconciliation, procurement approval and receiving QC, privilege escalation prevention, and revision-checked cart/wishlist synchronization, staff-only technician assignment, concurrent assignment conflicts, immutable assignment history, and independent QC exclusion of current/former assignees. Every one of the 82 legacy generated route families rejects anonymous mutations; unsupported protected workflows return 501.

The latest full browser suite passed 11 journeys and exposed a technician-picker label association defect. The label was corrected with an explicit control association; the affected purchase → assignment → repair → QC → warranty journey then passed in a targeted rerun.

Browser coverage includes guest purchase reservation, search/comparison, account migration/conflict recovery/sign-out/account switching, protected administration, supported staff tables and structured role, technician assignment, and QC forms, and a purchased device linked to its passport and completed repair warranty. Homepage responsive checks use 320, 375, 414, 768, 1024, 1440, and 1920 pixels; the broader product/store/repair/account checks use 375–1440 pixels. Automated WCAG AA checks cover the homepage and passport; this is not a whole-site accessibility certification.

Integration tests use an isolated test database. Browser tests create explicitly named accounts, reservations, device records, repairs, and test store receipts in the local development database. Development metrics include those fixtures. No live payment, outbound message, remote deployment, production database, production load test, or backup restore was exercised.

The current compiled server passed eight HTTP smoke checks: homepage, product, support, admin, sitemap, robots, manifest, and offline page. Product structured metadata and private-route noindex metadata were checked. The temporary smoke server was stopped afterward.

See [Device OS progress](device-os-progress.md), [all 203 requirements](requirements-register.md), and [operations](operations.md) for the unfinished scope and launch dependencies.

## Homepage and PWA release checks

The navy/gold homepage preserves the supplied banner and uses database-backed variant selection and cart actions. Mobile navigation and installation guidance were checked at 320–1920 px. The homepage accessibility scan exposed low-contrast footer and price-label text; both were corrected.

The compiled-production PWA check passed: standalone manifest, reachable icons, active service worker, an exact public-only cache containing `/offline.html` and `/icon.svg`, and offline navigation to a private URL returning the public recovery page. No private API response is cached. Native installation on physical iOS/Android devices was not tested.

The PWA check also exposed a release build defect: a development `NODE_ENV` in the local `.env` removed service worker registration and included development React. `scripts/build-client.mjs` now explicitly selects production before importing Vite. The rebuilt main JavaScript bundle is 282.19 KB (89.60 KB gzip), down from 514.66 KB (147.53 KB gzip); there is no large-chunk warning. This is a bundle-size measurement, not a Core Web Vitals certification.
