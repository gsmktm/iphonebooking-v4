# iPhoneBooking V2

Nepal-built Apple commerce, reservations and device care. React 19/Vite/TypeScript, Express 5, Prisma 6.19 and PostgreSQL remain the foundation.

**Status: working local full-stack implementation; public production launch and the complete enterprise specification are not certified.** The latest work adds a premium Himalayan homepage, one semantic navy/gold identity, self-hosted Inter/Instrument Serif, a published homepage feed, verified-purchase reviews and audited moderation, CMS section copy, requested route aliases and private repair tracking. Existing checkout, account, payment verification, inventory and service workflows are preserved.

## Start locally

Requires Node 24, pnpm 12.6.0, PostgreSQL 16+ and a private `.env` based on `.env.example`.

```sh
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:migrate
# Fresh development data only; requires SEED_DEVELOPMENT=true:
pnpm db:seed
pnpm dev
```

Run `pnpm worker` separately for reservation cleanup, configured payment reconciliation and configured account email. The development seed is refused in production, preserves existing role permissions and creates no fake customer reviews, orders or revenue.

- Storefront: http://localhost:5173
- Administration: http://localhost:5173/admin
- API readiness: http://127.0.0.1:4000/api/health
- Use the private admin credentials in your own environment. There is no shared default password.

The existing workspace is already migrated and has development records. Prices, specifications, stock, store details and generated product illustrations are marked as development data. They need merchant review before commercial use.

## Connected journeys

- Homepage product spotlights, server-filtered device collections, a budget/stock device finder, fresh quick-look configuration and pickup availability. Saved devices and the last eight viewed products form personal shelves; browsing history stays in the current tab and can be cleared.
- Active catalog, configuration selection, URL filters, cross-domain search, comparison, wishlist and persistent bag; revision-checked account synchronization.
- Guest/account checkout with server quotes, Nepal addresses, policy snapshots, transactional stock holds, accepted trade-in credit, private confirmation and tracking.
- Permissioned store collection and server-verified Khalti checkout when configured; uncertain payment outcomes remain under review. No browser redirect is proof of payment.
- Allocation, staged fulfillment, masked serial registry, ownership passport, repair intake/quotation/customer approval, parts use, QC and service warranty.
- Database valuation rules, inspection, versioned trade-in offers and final customer decisions; buyback intake does not claim payout execution.
- Accounts, addresses, sessions, configured password recovery/email verification, notifications and support conversations.
- Scoped retailer membership/application workflows, sourced published price observations, structured CMS pages, journal and verified delivered-purchase reviews.
- Protected admin tables/actions, audited decisions, procurement/receiving, money ledger, internal reconciliation and database-derived metrics.

Resend and Khalti remain disabled unless their complete configuration is supplied. Provider refund execution, eSewa/card adapters, shipping-provider integration, media processing, promotions, full localization and several enterprise/scaffold modules remain open. See the [production-readiness checklist](DEPLOYMENT.md#production-readiness-checklist).

## Verify and build

Create an isolated database with a name ending `_test` and set `TEST_DATABASE_URL`.

```sh
pnpm db:test:migrate
pnpm check
# Running development server and Chrome:
pnpm test:e2e
```

Production outputs are `apps/web/dist` and `apps/api/dist-server`. Configure production HTTPS origins, secrets and `SEED_DEVELOPMENT=false` before `pnpm start` and `pnpm start:worker`. Compiled PWA/release checks, packaging, backup and hosting instructions are in [DEPLOYMENT.md](DEPLOYMENT.md). No remote deployment has been performed.

## Engineering documents

| Document                             | Contents                                                               |
| ------------------------------------ | ---------------------------------------------------------------------- |
| [ARCHITECTURE.md](ARCHITECTURE.md)   | Components, boundaries, current architecture and source map            |
| [DATABASE.md](DATABASE.md)           | Schema integrity, ERD and all 17 migrations                            |
| [API.md](API.md)                     | Contracts, endpoint matrix, validation and authorization               |
| [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) | Tokens, typography, responsive behavior and generated-image provenance |
| [ADMIN.md](ADMIN.md)                 | Supported actions, permission matrix and staff workflows               |
| [SECURITY.md](SECURITY.md)           | Identity, privacy, commerce controls and limitations                   |
| [DEPLOYMENT.md](DEPLOYMENT.md)       | Environment, build/run, backups and launch checklist                   |
| [TESTING.md](TESTING.md)             | Checks, coverage and current verification results                      |

The [repository audit](docs/repository-audit-v2.md) records the original A–J findings. The [route map](docs/route-map.md), [full ERD](docs/database-erd.mmd), [endpoint inventory](docs/api-endpoint-matrix.md) and [permission inventory](docs/permission-matrix.md) are review artifacts. Regenerate inventories with `pnpm docs:generate` and format them with `pnpm format`.

The [older combined V2/V3 requirements register](docs/requirements-register.md) remains historical scope; current engineering documents supersede outdated payment, build-command and homepage claims in older notes.
