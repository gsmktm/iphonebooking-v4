# Production V2 repository audit

Audit date: 6 October 2026 (Asia/Kathmandu). This audit applies to the supplied 50-section brief and the existing, uncommitted implementation. Existing work is preserved.

## A. Current repository

The pnpm/Turbo workspace contains a React 19/Vite/TypeScript browser application and an Express 5/Prisma 6/PostgreSQL API. Catalog, authoritative checkout quotes, private receipt recovery, store and Khalti payment boundaries, account recovery, repair QC, trade-in quotations, procurement and retailer isolation already exist. They are preserved. The root README predates several of these implementations.

## B. Architecture map

Browser → React Router → TanStack Query → same-origin `/api/v1` → authenticated/validated Express routers → domain services → Prisma transactions → PostgreSQL. Zustand holds bag, comparison and wishlist UI state; customer synchronization has a database revision. The worker claims database jobs for reservation expiry and account mail. Vite builds the web application; Express serves the production bundle and metadata. No framework migration is justified.

## C. Active and obsolete files

`main.tsx` imports tokens, storefront, pages, admin, luxe, appearance and world CSS. All these are active; they are competing style layers, not safe deletion candidates. `HomeHero` and `WhatsNew` were imported by Home at audit baseline. The refreshed Home uses `HomeHero` and reusable `home-sections`; `WhatsNew.tsx` and `whats-new.css` now have no runtime imports. They are retained as existing uncommitted design work rather than discarded blindly. `features/category` is shared by category routes. `legacy-scaffolds.ts` deliberately rejects unsupported workflows and remains active. Root `dist/` and `dist-server/` are older build artifacts; current workspace builds live under `apps/web/dist` and `apps/api/dist-server`. Original illustrations in `docs/assets` are provenance records. They are not rendered as page screenshots.

## D. Database review

Core products/variants/categories, store stock, immutable inventory movements, order price snapshots, policy acceptance, sessions, payments, ownership, repairs, trade-ins, CMS and audit records are relational. Later migrations add canonical device identity, QC, procurement, money entries, account recovery, retailer tenancy and publication controls. CUID identifiers and foreign keys are already established. Additive migrations are appropriate; no destructive schema reset is needed. Some future V3 tables remain workflow scaffolds and should not be marketed as finished features.

## E. API review

Versioned REST, Zod validation, pagination and server authorization already exist. Checkout validates live prices and stock; a lost-response retry requires the same private receipt key. Public catalog selects omit retailer-only store fields. Published market observations require source/configuration/currency context. Missing V2 pieces include reviews and a bounded homepage feed. Existing array responses are retained for their callers.

## F. Security review

Targeted inspection found HttpOnly session cookies, hashed session/receipt tokens, account suspension checks, origin/custom-header CSRF controls, Helmet/CSP, request limits, rate limiting, permission checks, audit entries and serial masking. Payment evidence is verified on the server and mismatches remain under review. Tests cover price changes, receipt replay, competing collection, tenant isolation, quote decisions and privilege escalation. No new P0 defect was established in this inspection. This is not a comprehensive penetration test or production certification. bcrypt is currently used; Argon2id/JWT migration is unnecessary for the design work and remains a separately assessed security decision.

## G. Design conflicts

The brief requests Inter/Instrument Serif and semantic navy/gold colors. Current styles mix system UI, Georgia, Cormorant Garamond, Rajdhani and Space Mono. Colors are redefined in tokens, appearance and world; radii are inconsistent. The hero illustration contains conceptual devices. Category marketing includes unsupported future specifications. Homepage reviews/news/network sections do not share a bounded data contract.

## H. Baseline checks

- `pnpm typecheck`: passed.
- `pnpm test`: 6 files, 44 tests passed.
- Homepage Playwright WCAG AA automation: passed.
- `pnpm lint`: failed on formatting in 45 pre-existing files; no functional test changes are justified by that failure.

## I. Prioritized debt

| Priority | Finding                                                                            | Action                                                                                                                                                 |
| -------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P0       | Merchant/hosting/catalog/policy acceptance is external and unverified              | Keep unconfigured integrations explicit; do not claim a public production launch                                                                       |
| P1       | Concept seed products and static future specifications can appear as catalog facts | Retire only identified development fixtures; use database product layers and specification copy                                                        |
| P1       | Reviews have no verified-purchase, persistence or moderation flow                  | Add relational reviews, customer eligibility, admin moderation and audit history                                                                       |
| P1       | Requested public URL aliases and homepage sections are incomplete                  | Preserve canonical routes; add aliases and a published homepage feed                                                                                   |
| P2       | Several active global identity layers compete                                      | Centralize semantic tokens, typography and control styling; consolidate campaign styling                                                               |
| P2       | Documentation and build commands are out of date                                   | Provide the requested engineering documents, endpoint/permission matrices and readiness boundary                                                       |
| P2       | Existing formatting prevents the required lint gate                                | Format existing files without changing their behavior                                                                                                  |
| P3       | Homepage lacks the requested premium visual hierarchy                              | Implement responsive Himalayan campaign, trust, quick actions, products, ecosystem, services, network, intelligence, journey, reviews, journal and CTA |

## J. Implementation plan

1. Preserve the baseline; add review and homepage API contracts with privacy, validation and authorization tests.
2. Apply additive review/CMS migrations and remove conceptual development fixtures from public visibility without deleting historical records.
3. Consolidate tokens and use self-hosted Inter/Instrument Serif; build semantic, responsive DOM sections around actual catalog data.
4. Connect product reviews, moderation, CMS section copy and requested route aliases.
5. Run formatting, TypeScript, isolated API tests, production build, browser journeys and accessibility checks at the required viewport widths.
6. Update all requested engineering documents and state remaining external production requirements precisely.

## Implementation follow-through

The homepage now consumes a published, bounded API composition. Verified reviews persist against delivered orders and require independent audited moderation. The migration retires only marked conceptual development fixtures without deleting historical relationships. Public repair tracking checks ownership. Requested aliases and canonical product/news redirects are implemented. The font/palette definitions are centralized, and duplicate active hero selectors were removed from the former global CSS.

The requested eight root engineering documents, complete current ERD, route map, literal endpoint inventory and permission inventory are delivered. A local private recovery snapshot was created after the additive migrations; no production backup/restore claim is made. Final checks and remaining launch dependencies are recorded in [TESTING.md](../TESTING.md) and [DEPLOYMENT.md](../DEPLOYMENT.md).

The dependency scan additionally identified a high-severity `source-map-js` advisory in the frontend build graph. The workspace pins the patched 1.2.2 version; the reference and final audit result are in [SECURITY.md](../SECURITY.md) and [TESTING.md](../TESTING.md). The browser checkout fixture was changed to choose genuinely available catalog stock after its previously fixed configuration was depleted.
