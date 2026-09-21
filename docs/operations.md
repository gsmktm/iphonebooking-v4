# Environment and operations

## Environment reference

| Variable                         | Purpose                                                                                            |
| -------------------------------- | -------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                   | PostgreSQL connection for the application/migration process                                        |
| `TEST_DATABASE_URL`              | Separate database ending in `_test`; used by Vitest                                                |
| `NODE_ENV`                       | `development`, `test`, or `production`; production serves the built client and sets Secure cookies |
| `APP_ORIGIN`                     | Exact allowed browser origin for mutations, including scheme and port                              |
| `PUBLIC_ORIGIN`                  | Canonical public URL for SEO; defaults to APP_ORIGIN                                               |
| `PORT`                           | API listener, default 4000                                                                         |
| `HOST`                           | Listener interface, default 127.0.0.1; use 0.0.0.0 inside the container                            |
| `TRUST_PROXY_HOPS`               | Exact number of trusted reverse proxies; leave empty locally                                       |
| `SEED_DEVELOPMENT`               | Explicit permission to load example catalog data; never true in production                         |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Used only when creating the initial local seed administrator                                       |
| `PAYMENT_MODE`                   | Reserved configuration marker; only the unconfigured adapter is implemented                        |

`.env` is excluded from version control and Docker build context. Keep all production credentials in a secret manager. Do not expose them as Vite `VITE_*` variables.

## Deployment procedure

1. Complete the launch blockers listed in `implementation-status.md`. A compiled build alone is not production approval.
2. Provision separate development, staging, and production databases. Use TLS in transit, encrypted volumes, and automatic managed backups/PITR.
3. Run `npm ci`, `npm run db:generate`, formatting/type checks, isolated integration tests, browser tests, and `npm run build` in CI.
4. Review migration SQL. Take a backup before applying a migration. Run `npm run db:migrate` once from a privileged deployment job. Never run `migrate reset` or `db push` on production.
5. For Docker, build the `migration` target for the one-time schema job and the `runtime` target for API/worker containers. Supply environment variables at runtime. Do not copy `.env` into images.
6. Run the API behind an HTTPS reverse proxy with a precise Origin configuration. Set `TRUST_PROXY_HOPS` only for that deployment topology. Add shared rate-limit storage before scaling API replicas.
7. Run at least one worker using `node dist-server/worker.js`. The database conditionally claims jobs; cleanup is idempotent. Monitor DEAD jobs and processing leases.
8. Probe `/api/health`, load a product, and exercise a staging purchase/service journey. Canary or rolling replacement can be used for additive schema changes. No zero-downtime guarantee has been tested here.
9. Enable monitoring and verify rollback to the previous application artifact. Prefer forward schema fixes to destructive database rollback.

The local build has not been deployed to a public host. No DNS, CDN, payment merchant account, SMS gateway, or email service has been modified.

## Payment setup

Online payments intentionally return `PAYMENT_NOT_CONFIGURED`. Implement each provider against its verified merchant documentation and sandbox. Required configuration generally includes a merchant identifier, environment-specific API credentials, a server callback URL, and webhook verification material; exact variable names are deliberately not invented until the provider integration is written.

Mount provider callbacks with a raw-body parser before browser CSRF middleware and JSON parsing. An adapter must verify signature, transaction reference, expected amount, currency, and merchant identity server-side. Record webhook IDs with the existing unique provider/event key, update payment/order/stock in one transaction, and enqueue a notification. Implement replay tests, failed-payment recovery, reconciliation, partial/full refunds, and receipt recovery before enabling it. Browser redirect status must never establish payment success.

The store-payment screen is for authorized staff recording money already received. It is not a simulated card/e-wallet payment. Refund request records do not send refunds.

## Notifications

In-app notifications are persisted and shown in the account. Newsletter subscriptions save consent preferences. Email, SMS, and push delivery are not configured or sent. Add verified sender configuration, preference enforcement, unsubscribe tokens, idempotent outbox handlers, retry/dead-letter monitoring, and delivery tests before enabling outbound messages.

## Backups and restores

Use provider-managed PITR and daily encrypted backups. A local/manual PostgreSQL archive can be created without putting secrets in command arguments by supplying a protected PostgreSQL service file or secret-managed environment:

```sh
pg_dump --format=custom --file=backup.dump "$DATABASE_URL"
```

Keep archives outside the repository in access-controlled storage. Test restores into a **new isolated database** and verify inventory ledgers, payment totals, ownership, and audit records. Do not restore over a running production database. Retention and recovery objectives require business approval and have not been configured by this build.

## Incident procedure

- Capture the support request ID, time window, and affected business record; do not copy customer secrets into logs.
- Stop the affected payment/provider route or order fulfillment if correctness is uncertain. Preserve database evidence.
- Check API health, correlated error logs, database locks, job leases/dead letters, and provider reconciliation records.
- For a stock mismatch, compare reservation/order history and the stock ledger before making an audited adjustment. Do not overwrite quantities by direct SQL.
- For suspected account compromise, revoke sessions and rotate affected credentials. Session tokens and passwords must never be logged.
- Restore only into isolation until the recovery plan is reviewed. Document the fix, customer impact, and follow-up test.

## Known operational limits

No hosted monitoring, load test, penetration test, restore drill, production gateway test, tax invoice certification, or disaster recovery exercise has been performed. Current API rate limiting is process-local. Catalog responses have a 100-record bound. Admin tables paginate at 50 rows. Logs are structured stdout; centralized retention/alerts are deployment work.

## Device OS migration and rollout notes

Read [ADR 002](architecture/adr-002-device-os-domain-boundaries.md) before rollout. The original V3 scaffold migration is retained; its generic HTTP routers are replaced by protected unavailable responses. Deploy the API and worker from the same revision: an older reservation worker does not write the new money ledger.

Bridge migrations preserve units and historical order snapshots. They abort on conflicting identity links or invalid purchasing/part balances rather than silently discard data. Backfills create labelled migration events and financial entries, not fabricated past events. Review conflicting identities manually before retrying a failed migration. Legacy unit location inference is limited to variants with one stock location; other units must be reconciled before allocation.

Device events, part movements, QC evidence, and order money entries are protected by append-only triggers. Trade-in quote snapshots cannot be rewritten. Corrections need explicit subsequent business records; do not disable triggers for ordinary administration.

`REQUIRE_INDEPENDENT_REPAIR_QC=true` requires an assigned repairing technician ID and a different checker. `REQUIRE_INDEPENDENT_RECEIVING_QC=true` prevents the receiving staff member from approving receiving QC. Both flags default to false for local development; configure them according to the reviewed operating policy. Procurement approval always requires a different creator and approver.

New development role templates are Quality Inspector, Procurement Officer, and Procurement Approver. Existing roles are not silently overwritten by the seed. Use the permission-controlled role editor and account role assignment; role updates revoke affected sessions. The permission catalog describes the implemented permissions.

Internal order reconciliation is not bank or gateway reconciliation. Store receipts require actual confirmation by staff in commercial use. Browser E2E fixtures deliberately create clearly named development orders and test store receipts; never run those against commercial data.

Account shopping-state migration adds a nonnegative revision counter without deleting existing carts or wishlists. Deploy the updated client with the API. The client includes the expected account ID and revision in every write; older supported cart/wishlist routes also increment the counter. Browser local storage contains selections, never session credentials.
