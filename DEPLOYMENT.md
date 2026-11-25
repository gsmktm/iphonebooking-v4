# Deployment and operations

The local application and compiled release are reviewable. No public deployment has been performed. Launch requires reviewed commercial data, operational policies and external integration validation; the readiness checklist below distinguishes those from repository checks.

## Development

Use Node 24, pnpm 12.6.0 and PostgreSQL 16+. Copy `.env.example` to a private `.env`, configure a development database and unique administrator credentials, then:

```sh
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:migrate
# Fresh development database only, with SEED_DEVELOPMENT=true:
pnpm db:seed
pnpm dev
```

The web app is at `http://localhost:5173`; API is at `http://127.0.0.1:4000`. Run `pnpm worker` separately when testing expiration/reconciliation or configured account mail. Browser fixtures intentionally change local development records; never run them on commercial data.

## Environment variables

Process environment overrides API-local `.env`, then root `.env`. `.env.example` contains public examples and blank secret fields, not live credentials.

| Variable                                  | Purpose / production rule                                                                      |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                | `development`, `test` or `production`; production enables secure cookies and built web serving |
| `DATABASE_URL`                            | Private PostgreSQL connection with a least-privilege application account                       |
| `TEST_DATABASE_URL`                       | Isolated integration database, with a name ending `_test`                                      |
| `APP_ORIGIN`                              | Required exact HTTPS browser origin in production                                              |
| `PUBLIC_ORIGIN`                           | Required exact HTTPS canonical public origin in production                                     |
| `ADMIN_ORIGIN`                            | Optional exact HTTPS admin origin; its host must proxy `/api` correctly                        |
| `HOST`, `PORT`                            | Listener; default `127.0.0.1:4000`, container uses `0.0.0.0`                                   |
| `TRUST_PROXY_HOPS`                        | Exact trusted proxy count; default zero                                                        |
| `SEED_DEVELOPMENT`                        | Must be `false` in production; seed is refused in production                                   |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`           | Private initial development seed identity; not normal runtime authorization                    |
| `REQUIRE_INDEPENDENT_REPAIR_QC`           | Require a checker independent of every assigned technician                                     |
| `REQUIRE_INDEPENDENT_RECEIVING_QC`        | Require receiving QC independent of receiver                                                   |
| `MAIL_PROVIDER`                           | `unconfigured` or `resend`; disabled by default                                                |
| `RESEND_API_KEY`, `MAIL_FROM`             | Private provider key and verified sender                                                       |
| `AUTH_EMAIL_SECRET`                       | At least 32 characters, required for configured account email; same key on API and worker      |
| `KHALTI_ENVIRONMENT`, `KHALTI_SECRET_KEY` | `sandbox`/`production` plus merchant key; both blank disables online payment                   |
| `PWA_TEST_ORIGIN`, `RELEASE_TEST_ORIGIN`  | Optional localhost origins for compiled checks, default port 4101                              |

Partial production mail/payment configurations are rejected. Origins cannot contain wildcard hosts, credentials, paths, queries or fragments. Current authentication uses secure sessions, so unused JWT/SMTP/S3 variables from conceptual specifications are not invented as working integrations.

## Build and run

```sh
pnpm check
pnpm db:migrate
pnpm start
pnpm start:worker
```

Set production variables before starting. The build emits `apps/web/dist` and `apps/api/dist-server`; root `dist` directories are old artifacts. Vite's build wrapper selects production explicitly so a local development `.env` cannot strip service-worker registration. Supervise API and worker separately and deploy them from the same revision.

Terminate HTTPS at a reviewed reverse proxy, forward the correct host/protocol, and set the exact trust hop count. The API checks environment and database connection at startup; missing built web assets fail startup. `/health` is liveness; `/ready` and `/api/health` check database readiness. API and worker handle shutdown with bounded grace periods. Production hashed assets are immutable; HTML and private/API data are not cached.

The Dockerfile provides build, migration and runtime targets. Build/runtime default to Node 24 and pnpm. Apply migrations as a deployment job; do not run the development seed in that job. The Docker CLI is installed locally, but its daemon is unavailable, so container build verification was not performed. Remote infrastructure requires separate execution/verification. The cPanel entry point under `deployment/cpanel` is a hosting adapter, not evidence of a live deployment.

For local compiled checks, run a temporary process with production mode, seeding disabled, port 4101 and HTTPS origin configuration. The loopback HTTP listener is reached directly only for verification; deployed traffic must traverse HTTPS.

```sh
NODE_ENV=production SEED_DEVELOPMENT=false PORT=4101 \
APP_ORIGIN=https://localhost:4101 PUBLIC_ORIGIN=https://localhost:4101 pnpm start
# In another terminal:
pnpm test:pwa
pnpm test:release
pnpm release:package
```

The release archive uses an allowlist and checksums. It excludes `.env`, dependencies, logs, dumps and Git metadata. Upload approved runtime assets only; provision secrets and database access separately. Add the worker supervisor and backup/alert configuration at the host.

## Backups and rollback

Create PostgreSQL custom-format backups using a protected connection configuration and encrypt them in access-controlled off-site storage. Specify retention, recovery objectives and restore ownership. Restore into a new isolated database, then verify ledgers, balances, device relationships and audit records before any production recovery. A local dump alone is insufficient.

Migrations are additive and history is retained. Never reset the database to revert an application deploy. Test older application compatibility with added columns/tables; use forward corrective migrations for data/integrity issues. Keep API/worker versions coordinated. Preserve financial evidence when a payment outcome is uncertain.

## Production-readiness checklist

- [x] Repository audit, current architecture, ERD, route/API/permission maps and environment documentation.
- [x] Additive migrations applied locally without reset; conceptual development fixtures hidden without deleting history.
- [x] Real catalog/checkout/account/service/admin boundaries and verified-review persistence implemented.
- [x] Local recovery snapshot kept outside source control.
- [x] Formatting, TypeScript, 51 unit/API tests, 19 browser tests, production build, dependency audit, PWA and compiled release checks; see [TESTING.md](TESTING.md).
- [ ] Replace all development product facts, illustrations, stock, store details and policies with approved commercial records.
- [ ] Validate Khalti merchant sandbox/live behavior and configured Resend sender/inbox delivery; enable only tested capabilities.
- [ ] Complete required shipping, returns/refund execution, tax invoices, promotions, media management and any enterprise modules required for launch.
- [ ] Provision HTTPS hosting, supervisors, production database permissions, shared rate limits, alerts and secret management.
- [ ] Perform off-site backup/restore drill, load testing, manual accessibility/device review and security review.
- [ ] Confirm merchant/business policy acceptance and production release sign-off.

Schema-only V3 domains, bank settlements, eSewa/card adapters, full localization and arbitrary CMS layout/navigation are outside the verified implementation. These unchecked items are explicit launch dependencies, not successful features.
