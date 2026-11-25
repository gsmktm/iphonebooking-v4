# Testing and verification

Tests validate business boundaries as well as UI rendering. Use the current pnpm scripts; older npm/root-build-path instructions in historical notes are superseded by this document and [DEPLOYMENT.md](DEPLOYMENT.md).

## Required checks

```sh
pnpm db:generate
pnpm --filter api exec prisma validate
pnpm db:test:migrate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
# Development server and Chrome required:
pnpm test:e2e
# Temporary local compiled production server required:
pnpm test:pwa
pnpm test:release
pnpm audit --audit-level=moderate
pnpm release:package
```

API integration tests refuse a database whose name does not end `_test`. Vitest overrides `DATABASE_URL` using `TEST_DATABASE_URL`; test migrations apply the same reviewed schema. Do not point browser journeys at production: they create explicitly named accounts, reservations, receipts, device records and service fixtures in the local development database.

## Coverage

The existing suites exercise authoritative price quotes, concurrent stock reservations, receipt replay/ownership, provider mismatch/uncertainty, competing store collection, policy snapshots, reservation expiry, account/session security, role escalation, retailer tenancy, inventory allocation, ownership passports, technician assignments, parts consumption, QC/warranty, versioned trade-in decisions, immutable evidence, money reconciliation and revision-aware cart/wishlist synchronization.

The new review/home suite covers delivered-purchase eligibility, strict customer fields, duplicate submission, private pending text, independent permission-gated moderation, stale revisions, audit records, first-name public projections, accurate aggregates, unpublished/inactive data exclusion, bounded home results, CMS section/link validation, owner-only repair tracking and database readiness.

Homepage discovery adds API cases for matching budget/stock/offers/pre-booking on the same variant, public pickup projections, published CMS visibility and private drafts. Five browser journeys cover finder results, configuration links, server collection filters, carousel movement, fresh quick-look/cart actions, clearable history, CMS composition and failed-load recovery. Keyboard focus and body scrolling are checked after both finder previews and nested repair dialogs.

Browser journeys cover anonymous/account shopping sync, theme persistence, both homepage theme accessibility scans, purchased device/service workflow, live catalog configuration, guest checkout, search/compare, customer protection and administrative dialogs. Responsive homepage checks cover 320/375/414/430/768/1024/1440/1920 px; product/store/repair/account checks cover 375/414/430/768/1024/1440/1920 px.

The compiled PWA check verifies manifest/icons, active service worker, the exact public-only cache and offline recovery. The release smoke check verifies built files, liveness/readiness, published homepage data, CSP/no-store/request IDs, metadata, product JSON-LD, private noindex, canonical redirects and genuine 404 responses.

Automated Axe checks are useful regression gates, not a complete accessibility conformance certificate. Live providers, real inbox delivery, public hosting, physical-device installation, load behavior and off-site restore are not simulated as verified production results.

## Current run

The homepage enhancements passed **54 unit/API tests across eight files**. All **24 distinct browser cases** were verified across the complete regression run and focused reruns, including both homepage themes, all required widths, checkout, account synchronization, device care and staff dialogs.

| Check                      | Verified result on 6 October 2026                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| Prisma schema              | Valid; current review migration applied to development and isolated test databases                 |
| Formatting                 | Passed after formatting existing files and the new deliverables                                    |
| Strict TypeScript          | Passed                                                                                             |
| Unit / API integration     | **54 passed across 8 files**, including successful fixture cleanup                                 |
| Web / API production build | Passed; both build tasks succeeded                                                                 |
| Dependency audit           | No known vulnerabilities after pinning `source-map-js` 1.2.2                                       |
| Compiled release smoke     | Passed: artifacts, database readiness, public feed, security/SEO/privacy headers, aliases and 404s |
| Compiled PWA               | Passed: manifest, icons, active service worker, exact public-only cache and offline recovery       |
| Browser regression         | **24 distinct cases verified** across the full run and focused reruns; see the note below          |
| Docker build               | Not run: local Docker daemon unavailable                                                           |

The 23-case complete browser run passed 20 cases. Two older selectors assumed a single product card/status message; they now target the collection and cart confirmation explicitly. A repair-QC assertion ran before its confirmed server save and cache refresh completed; it now checks the HTTP response and waits for the form to close. Those three cases passed their focused rerun in 51.2 seconds.

Final review added the fifth homepage browser case for failed-load recovery and finder focus restoration, and fixed nested modal scroll cleanup. The final ten-case homepage/modal regression passed **10/10 in 3.0 minutes**, including all five new cases, both mobile-home cases, search/comparison, the purchased-device repair workflow and staff dialogs. This is cumulative coverage of all 24 cases, not a claim that a single final 24-case invocation was run. Trace recording was disabled locally; CI retains failure traces.

Release packaging passed: the archive contains only allowlisted runtime artifacts, migrations and engineering documents, with SHA-256 checksums and no environment secrets, logs, dependencies or database dumps.

Current bundle sizes: initial main JavaScript **324.56 KB / 101.78 KB gzip**, main CSS **97.09 KB / 18.99 KB gzip**. Other pages are split into lazy chunks. These are build measurements, not a Core Web Vitals result.

Desktop (1440 px) and mobile (375 px) previews were inspected locally. Enhancement screenshots include `/tmp/iphonebooking-spotlights-desktop.png`, `/tmp/iphonebooking-collection-desktop.png` and `/tmp/iphonebooking-finder-dialog-mobile.png`. The local development server remains available at port 5173; the temporary compiled-check server is stopped after verification.

No live merchant payment, actual outbound account email, remote deployment, physical-device installation, complete manual accessibility audit, production load test or off-site restore drill was exercised.
