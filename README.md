# iPhoneBooking V2

A working React/TypeScript storefront and Express/PostgreSQL operations application for an Apple-device lifecycle: discover → reserve → record store payment → allocate a serial → fulfill → own → repair → trade in.

**Status: local development implementation, not a completed or certified production platform.** The combined 203-section V2/V3 specification is larger than the features implemented here. Live payment gateways are deliberately disabled. See [implementation status](docs/implementation-status.md) for the exact boundary.

The initial V2 build started from an empty workspace. Subsequent V3 work preserves existing records and migrations, replaces unsafe generated CRUD routes with protected workflow boundaries, and extends the relational model through additive migrations. See the Device OS progress report for that audit and implementation scope.

## Run locally

Requires Node 24, PostgreSQL 16+, and npm. The current workspace already has a local `.env`, migrated database, development catalog, and private generated admin password.

```sh
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Run the reservation worker in a second terminal:

```sh
npm run worker
```

- Storefront: http://localhost:5173
- Administration: http://localhost:5173/admin
- API health: http://127.0.0.1:4000/api/health
- Admin sign-in: use `ADMIN_EMAIL` and `ADMIN_PASSWORD` from your local `.env`. There is no shared default password. These values are not committed or printed in documentation.

For a fresh machine, create an empty development database, copy `.env.example` to `.env`, and set `DATABASE_URL` and a unique admin password first. Seeding is opt-in (`SEED_DEVELOPMENT=true`), idempotent, and refused when `NODE_ENV=production`. Do not run the development seed against a commercial database.

Seed catalog prices, stock, store details, specifications, and generated imagery are **development examples**, visibly identified in the storefront footer. They require review and replacement before commercial use. No orders, customer reviews, revenue, or chart figures are fabricated by the seed.

## Working journeys

- Database-driven categories, configuration selection, URL filters, SKU/name search, comparison URLs, local wishlist, persistent anonymous bag, authenticated cart merge and persistence.
- Guest or account checkout with Nepal address fields; server-side integer prices; serializable stock reservations; booking deposit amounts; accepted trade-in credits; unpaid store-payment confirmation and private tracking key.
- Staff payment recording with unique receipt references, pre-booking allocation, fulfillment stages, physical serial assignment, device ownership, and warranty records.
- Linked repair requests, staff diagnosis and quotations, immutable customer quote approval/rejection, service stages, and history under My Devices.
- Server-driven trade-in valuation rules, inspection, final customer decisions, exchange credit, and buyback request intake.
- Account orders, bookings, devices, repairs, trade-ins, addresses, notifications, threaded support, profile, password change, and session revocation.
- Protected admin tables, real aggregate metrics, product/configuration creation, stock receipt and adjustment, masked serial registry, content editing, support replies, pricing and valuation audits, and page-level CSV export.
- Scheduled reservation cleanup through a database-backed worker with conditional job claims, retries, leases, and dead-letter status.

Additional Device OS workflows now connect canonical device identity, owner-only passports, compatible repair-parts consumption, required QC, service warranties, versioned trade-in offers, independently approved procurement, receiving QC, order-money entries, and internal reconciliation. Legacy generated CRUD endpoints are deliberately disabled. See [Device OS progress](docs/device-os-progress.md).

## Checks

Create a separate database whose name ends with `_test`. Set `TEST_DATABASE_URL` to it. Integration tests never use the normal development database URL.

```sh
DATABASE_URL="$TEST_DATABASE_URL" npm run db:migrate
npm run lint
npm run typecheck
npm test
npm run build
npm audit --audit-level=moderate
```

With the development server running and Google Chrome installed:

```sh
npm run test:e2e
```

The browser tests create an explicitly named test reservation in the configured development storefront. Never point them at a production site. API tests use an isolated test database and cover the connected lifecycle, overselling, authorization, quote replay, payment boundaries, stock expiry, and private support notes. Browser checks cover configuration/checkout, search/comparison, account protection, admin screens, WCAG AA automation on the homepage, and 375/414/768/1024/1440 px layouts. Automated accessibility checks are not a complete WCAG conformance audit.

## Production build

```sh
npm run build
NODE_ENV=production npm start
NODE_ENV=production npm run start:worker
```

The build emits `dist/` (client) and `dist-server/` (Node). Production Express serves the application and public page metadata. A Dockerfile provides separate `migration` and `runtime` targets. The repository includes CI validation; **no remote deployment has been performed**.

Before enabling a public site, follow [deployment and operations](docs/operations.md), finish the open items in [implementation status](docs/implementation-status.md), verify the commercial catalog and policies, and supply actual integration credentials.

## Documentation

- [V2 + V3 acceptance register — all 203 sections](docs/requirements-register.md)
- [Device OS continuation: working flows and remaining scope](docs/device-os-progress.md)

- [Local verification results](docs/verification.md)
- [Architecture and database](docs/architecture.md)
- [API and role matrix](docs/api.md)
- [Environment, deployment, backups, and incidents](docs/operations.md)
- [Implementation status and remaining scope](docs/implementation-status.md)
- [Design system and image provenance](docs/design.md)
