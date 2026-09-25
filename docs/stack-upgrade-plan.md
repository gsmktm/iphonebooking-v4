# Plan: iPhoneBooking Stack Upgrade (v2 → Target Stack)

**Generated**: 2026-09-25 · **Estimated Complexity**: High · **Strategy**: Strangler — in-place, phase-by-phase (approved)

## Overview

Upgrade `iphonebooking-v2` in place to the agreed target stack. Every sprint ends
green (`pnpm check` + Playwright) and demoable; the REST contract
(`{ success, data, message, meta }`) stays frozen during Express → NestJS; the Vite
SPA keeps serving until Next.js parity. Already-compliant layers: **TanStack Query +
Zustand, Tailwind 4, Vitest + Playwright**.

### Assumptions (flag if wrong)

1. Admin exists only as embedded `src/pages/Admin.tsx` → Sprint 13 extracts `apps/admin` (may later port from `iphonebooking-config/apps/admin`).
2. Search: **Meilisearch** first (vs Typesense); OpenSearch only if scale demands.
3. Infra (Redis/Meilisearch/MinIO) via repo `docker compose`; production = managed services.
4. Versions below verified live 2026-09-25 — re-verify before bumping past them.

## Verified target versions

| Layer      | Pin                                               | Status         |
| ---------- | ------------------------------------------------- | -------------- |
| Next.js    | **16.3.4** (16.3.x)                               | ✓ current      |
| React      | **19.3.0** (2026-09-09)                           | ✓ current      |
| Prisma     | **7.10.0 GA** → **8.0.0-rc.1** (wait for GA)      | ✓              |
| PostgreSQL | **18.6** (19 in beta)                             | ✓ current      |
| NestJS     | **v12** (`@nestjs/platform-fastify`, Fastify 5.x) | ✓ current      |
| pnpm       | **12.6**                                          | ✓ current      |
| Tailwind   | 4.3.x (in repo)                                   | ✓              |
| Turborepo  | latest 2.x                                        | pin at install |

## Gap analysis → sprint mapping

| Layer           | Target                     | Current (HEAD)                               | Sprint |
| --------------- | -------------------------- | -------------------------------------------- | ------ |
| Public frontend | Next.js 16.3 App Router    | Vite 7 SPA + react-router 7                  | 12     |
| Admin frontend  | React 19.3 + Vite + TS     | embedded `src/pages/Admin.tsx`               | 13     |
| UI              | Tailwind + Radix/shadcn DS | Tailwind 4.3, no primitives pkg              | 3      |
| API             | NestJS 12 + Fastify        | Express 5 + tsx watch                        | 6      |
| Main DB         | PostgreSQL 18.x            | `provider = postgresql`, version unpinned    | 5      |
| ORM             | Prisma 7 → 8               | 6.19.0 (`prisma-client-js`)                  | 5 / 14 |
| Cache + jobs    | Redis + BullMQ             | `server/worker.ts` setInterval → `runJobs()` | 7      |
| Search          | Meilisearch first          | SQL LIKE                                     | 8      |
| File/media      | S3 + CDN                   | none (`@aws-sdk` absent)                     | 9      |
| State           | TanStack Query + Zustand   | ✓ 5.90 / 5.0.8                               | —      |
| Forms           | React Hook Form + Zod      | Zod 3.25, hand-rolled forms                  | 4      |
| Monorepo        | pnpm + Turborepo           | single pkg + npm                             | 1      |
| Testing         | Vitest + Playwright        | ✓ 4.1.11 / 1.55 (+ axe)                      | —      |
| API docs        | OpenAPI/Swagger            | none                                         | 10     |
| Observability   | OTel + Sentry              | none (console JSON logs)                     | 11     |

## Prerequisites

- Node 24 ✓ present; corepack → pnpm (T1.1); Docker for Sprints 7–9.
- Start green: `npm run check` passes at HEAD; tag `pre-upgrade`.
- `git status` before every sprint — repo shared with other sessions; touch only sprint files.

## Sprint 1 — pnpm + Turborepo monorepo (no behavior change)

**Goal**: workspace layout, identical behavior. **Demo**: `pnpm dev` (:5173 → API), `pnpm check` + `pnpm test:e2e` green.

- **T1.1 Enable pnpm** — corepack → pnpm 12.6; add `"packageManager"` to `package.json`. _Valid_: `pnpm -v`.
- **T1.2 Workspace config** — new `pnpm-workspace.yaml` (`apps/*`, `packages/*`), new `turbo.json` (typecheck/lint/test/build/dev); move npm `overrides` → `pnpm.overrides` (effect, deepmerge-ts) — **pnpm ignores the npm key**. _Valid_: `pnpm install`; `turbo run build` resolves.
- **T1.3 SPA → `apps/web/`** — `git mv src index.html vite.config.ts tsconfig.json vitest.config.ts playwright.config.ts public scripts tests apps/web/`; fix paths in `scripts/build-client.mjs`, playwright baseURL/testDir, vitest include, tsconfig refs. _Valid_: `pnpm --filter web typecheck && pnpm --filter web build`.
- **T1.4 API → `apps/api/`** — `git mv server prisma tsconfig.server.json apps/api/`; fix dotenv cwd (`apps/api/server/index.ts`), workspace-filter scripts (`dev`, `start`, `worker`, `db:*`). _Valid_: `pnpm --filter api typecheck`; `db:migrate` status ok.
- **T1.5 Root + lockfile** — root `package.json` becomes private workspace root delegating to turbo; delete `package-lock.json`, commit `pnpm-lock.yaml`. _Valid_: `pnpm check` + `pnpm test:e2e` (5/5). **Tag** `sprint-1-ok`.

## Sprint 2 — Dependency alignment

**Demo**: same app, target pins, all green.

- **T2.1 React 19.3** — `apps/web/package.json`: `react`, `react-dom` → `^19.3.0`; `@types/react(-dom)` latest. _Valid_: `pnpm install && pnpm check` + e2e (19.1→19.3 non-breaking).
- **T2.2 Toolchain** — `pnpm up -L` for TS/vitest/playwright/prettier/vite minors; keep `zod@3` for now (Sprint 4 decides 3→4 alongside `@hookform/resolvers`). _Valid_: `pnpm check` + e2e. **Tag** `sprint-2-ok`.

## Sprint 3 — Design system (Tailwind 4 + Radix/shadcn, Diamond)

**Goal**: `packages/ui` consumed by two real pages. **Demo**: Home/Catalog restyled, axe clean.

- **T3.1 Tokens** — create `packages/ui/` (`@iphonebooking/ui`; peerDeps react 19.3 + tailwind 4) with `tokens.css` + Tailwind 4 `@theme`: Void `#000000→#03030A→#080810→#10101A→#1A1A2E`; Gold `#C9A84C / #E8C96A / #D4601A`; Cosmic `#4A7AA8`; text `#F0F0F8 / #9090A8 / #505068`; fonts Cormorant Garamond (display), Rajdhani (UI), Space Mono (IDs); glass `rgba(255,255,255,.025-.1)`, diamond-border `rgba(201,168,76,.18)`; motion `cubic-bezier(0.16,1,0.3,1)`. _Valid_: tokens compile into web build.
- **T3.2 Primitives** — Radix-backed, shadcn-style: `button, input, dialog, dropdown-menu, tabs, toast, badge, card, table, tooltip` in `packages/ui/src/*`; keyboard + a11y. _Valid_: tsc + render tests.
- **T3.3 Adopt** — port header/buttons from `apps/web/src/components` used by `src/pages/Home.tsx` and `src/pages/Catalog.tsx`; new `tests/a11y-ds.spec.ts`. _Valid_: `pnpm check`, e2e, axe zero violations. Design guardrail (frontend-design skill): distinctive Diamond luxury — no generic AI defaults. **Tag** `sprint-3-ok`.

## Sprint 4 — Forms: React Hook Form + Zod

- **T4.1** — add `react-hook-form` + `@hookform/resolvers` to `apps/web`; RHF field components (label/error wiring) in `packages/ui`.
- **T4.2** — migrate login/register in `apps/web/src/pages/Account.tsx` to `zodResolver` reusing **existing zod schemas** (validation parity); unit tests for submit/error paths.
- **T4.3** — migrate checkout in `apps/web/src/pages/Commerce.tsx` the same way; e2e checkout flow green. **Tag** `sprint-4-ok`.

## Sprint 5 — Database: Prisma 7 + PostgreSQL 18

**Demo**: app runs on Prisma 7 + PG 18, full suite green.

- **T5.1 Prisma 7 upgrade** — `apps/api`: `prisma`/`@prisma/client` 6.19 → `^7.10.0`; add `prisma.config.ts` (v7 config file replaces package.json fields); migrate generator `provider = "prisma-client-js"` → v7 `prisma-client` with explicit `output`; regenerate. _Valid_: `pnpm --filter api db:generate`.
- **T5.2 Code fixes** — update client import in `apps/api/server/db.ts` and any schema-type imports; scripts `db:generate`, `db:migrate`, `db:seed` point at config. _Valid_: `pnpm check` + full vitest + `db:migrate` against dev DB.
- **T5.3 PostgreSQL 18** — provision PG 18.x (managed one-click or `docker compose` pg:18); logical dump/restore or `pg_upgrade`; confirm `DATABASE_URL` `?sslmode=require`; keep pre-upgrade dump. _Valid_: full e2e + `prisma migrate status`.
- **Rollback**: tag `sprint-4-ok` + DB dump. **Tag** `sprint-5-ok`.

## Sprint 6 — NestJS 12 + Fastify (contract-preserving)

**Goal**: same REST contract, route-for-route parity; Express retired only at the end.
**Demo**: all clients work against Nest untouched (same URLs/status/envelope).

- **T6.1 Scaffold in place** — add Nest 12 deps to `apps/api` (`@nestjs/common`, `core`, `platform-fastify`, `config`, `schedule`); `src/main.ts` with Fastify adapter, port 4002, replace `helmet` → `@fastify/helmet`, `express-rate-limit` → `@fastify/rate-limit`, `cookie-parser` → `@fastify/cookie`; boot-time env guard (JWT/DATABASE, mirroring REQUIRED_ENV idea). _Valid_: health route 200.
- **T6.2 First modules** — port `server/routes/auth.ts`, `catalog.ts`, `commerce.ts` → `apps/api/src/modules/{auth,catalog,commerce}/`; move `server/services/{orders,payments}.ts` to providers; keep zod schemas as validation pipes. _Valid_: `pnpm --filter api test`.
- **T6.3 Contract tests** — `apps/api/test/contract/*.spec.ts`: supertest asserts recorded fixtures (status + `{ success, data, message, meta }`) from Express for every endpoint. **This suite is the safety net.** _Valid_: fixtures for 3 modules pass.
- **T6.4 Port remaining route batches** — `account`, `admin*`, `device-lifecycle`, `finance`, `operations`, `procurement`, `repair-*`, `roles`, `services`, `shop-state`, `legacy-scaffolds` (3 files/batch); each batch = 1 commit + contract green.
- **T6.5 Cut-over** — `dev`/`start` scripts run Nest only; delete Express `app.ts`/`core.ts` + express deps; port `server/worker.ts` boot if needed (queue replaced in S7). _Valid_: `pnpm check` + full Playwright. **Tag** `sprint-6-ok`.
- **Deps**: S1, S2. **Complexity**: highest sprint — do not rush batches.

## Sprint 7 — Redis + BullMQ

**Demo**: jobs run via queue; hot queries cached.

- **T7.1 Infra** — new `infra/compose.yml` (redis:8-alpine; meilisearch + minio added in S8/S9); env vars `REDIS_URL` in `apps/api/.env.example`; `pnpm --filter api add ioredis bullmq`.
- **T7.2 Queues** — `apps/api/src/queues/`: queue `jobs` with repeatable entries mapping today's `runJobs()` work from `server/services/jobs.ts`; `apps/api/src/worker.ts` runs BullMQ `Worker` (concurrency, retry/backoff, graceful SIGTERM); replace `start:worker` script. _Valid_: unit test add→process; job tick no longer setInterval.
- **T7.3 Cache-aside** — `apps/api/src/modules/catalog/cache.ts`: Redis TTL cache around product/list queries + invalidation on writes. _Valid_: hit/miss unit tests; e2e green. **Tag** `sprint-7-ok`.

## Sprint 8 — Search: Meilisearch

- **T8.1** — add meilisearch service to `infra/compose.yml`; `MEILI_HOST`, `MEILI_MASTER_KEY` env; `meilisearch` client in api.
- **T8.2** — index `products`: settings (searchableAttributes, filterable brand/category/price, sortable price); backfill script `apps/api/scripts/index-products.ts`.
- **T8.3** — catalog search route (`server/routes/catalog.ts` module) queries Meilisearch with SQL fallback on failure; index invalidation on product writes. _Valid_: search e2e (query → ranked results) + fallback unit test. **Tag** `sprint-8-ok`.

## Sprint 9 — Media: S3 + CDN

- **T9.1** — `@aws-sdk/client-s3` + presigned upload route; env `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `CDN_BASE_URL`; MinIO service for dev in `infra/compose.yml`.
- **T9.2** — replace any filesystem writes under `apps/api/uploads/` with presigned flow; URL-transform util rewrites stored keys through `CDN_BASE_URL` at read time.
- **T9.3** — backfill script for existing media; unit tests for URL rewrite. _Valid_: upload e2e → image renders via CDN URL. **Tag** `sprint-9-ok`.

## Sprint 10 — API docs (OpenAPI/Swagger)

- **T10.1** — `@nestjs/swagger` on modules/DTOs (or generate from existing zod schemas); serve `/api/docs`; commit generated `docs/openapi.json`.
- **T10.2** — CI script regenerates the spec and fails on diff. _Valid_: docs page renders; CI diff gate works. **Tag** `sprint-10-ok`.

## Sprint 11 — Observability (OpenTelemetry + Sentry)

- **T11.1** — api: `@sentry/node` + OTel SDK (OTLP exporter, Fastify + Prisma instrumentations, W3C traceparent propagation); keep structured logs, add request-id correlation.
- **T11.2** — web/storefront: `@sentry/react` + Vite/Next plugin; sourcemap upload in CI.
- **T11.3** — smoke: deliberately thrown test error appears in Sentry; trace shows http + db spans. **Tag** `sprint-11-ok`.

## Sprint 12 — Next.js 16.3 storefront (public frontend)

**Goal**: App Router parity, Vite SPA retired at the end. **Demo**: production build serving all public routes.
**Complexity**: 9 (largest UI sprint).

- **T12.1 Scaffold** — `create-next-app@16.3` → `apps/storefront` (App Router, TS, Tailwind 4, `src/`); new `packages/api-client` (typed fetch unwrapping `{ success, data, message, meta }`, TanStack Query hooks) shared with web/admin; `next.config` rewrites `/api/*` → API :4002 (same-origin proxy — avoids CORS/cookie pitfalls).
- **T12.2 Public routes** — port from `apps/web/src/pages`: Home, Catalog → `/store`, Product → `/product/[slug]`, Category(ies), Information pages. Server components with RSC fetch + ISR (`revalidate`), applying Vercel rules: `async-parallel` (Promise.all independent fetches), `async-suspense-boundaries` (stream shells), `bundle-dynamic-imports` (heavy widgets via `next/dynamic`), `server-cache-react`/LRU; `metadata`/OG per route; `sitemap.xml` + `robots.txt`.
- **T12.3 Client slices** — cart/checkout/search as client components; Zustand persist SSR-guarded; mutations via TanStack Query (per `rerender-*` rules); react-router `Link`/loaders → `next/link`/RSC fetch.
- **T12.4 SEO/perf** — Product JSON-LD; Lighthouse ≥95 on public routes; port `apps/web/tests/e2e/storefront.spec.ts` to the storefront baseURL.
- **T12.5 Cutover** — dark-launch both apps on one API, flip routing/DNS, retire Vite SPA + `react-router-dom` (move to `legacy/`). _Valid_: e2e green against Next only. **Tag** `sprint-12-ok`.

## Sprint 13 — Admin frontend (React 19.3 + Vite + TS)

- **T13.1** — scaffold `apps/admin` (vite react-ts, react 19.3, tailwind 4, `@iphonebooking/ui`, react-router 7).
- **T13.2** — extract `apps/web/src/pages/Admin.tsx` + admin routes/components → `apps/admin/src/` (lazy routes); remove admin code from storefront.
- **T13.3** — auth wiring (same API, ADMIN/SUPER_ADMIN role gate); Playwright admin spec (login → dashboard). _Valid_: admin e2e; storefront bundle no longer contains admin code. **Tag** `sprint-13-ok`.

## Sprint 14 — Prisma 8 + cleanup

- **T14.1** — when Prisma 8 GA: 7 → 8 with the S5 discipline (skip while RC).
- **T14.2** — cleanup dead deps (`express`, `react-router-dom` post-S12, stale `dist*`); update `README.md`/`AGENTS.md` stack tables; document every new env var (`REDIS_URL`, `MEILI_*`, `S3_*`, `CDN_BASE_URL`, `SENTRY_DSN`, `OTEL_EXPORTER_OTLP_ENDPOINT`) in a tokens doc (mirror `iphonebooking-config/ENV_TOKENS.md`).
- **T14.3** — final gate: `pnpm check` + full Playwright + Lighthouse. **Tag** `stack-upgrade-done`.

## Testing strategy

- Every sprint: `pnpm check` (prettier + tsc + vitest) + `pnpm test:e2e` (Playwright incl. axe specs) green **before** the sprint tag.
- S6: contract fixtures are the safety net; dual-run Express + Nest until parity, cut only when green.
- S12: storefront e2e must pass against Next before any traffic shift; SPA stays the fallback until `sprint-12-ok`.
- Infra sprints (7–9) each ship a unit test proving the integration (queue process, cache hit, search fallback, URL rewrite).

## Potential risks & gotchas

- **pnpm strictness**: npm hoisting hid phantom deps → expect missing-module errors in S1; declare deps explicitly, don't disable strict mode.
- **overrides migration**: npm `overrides` silently ignored by pnpm → `pnpm.overrides` in T1.2 or `effect`/`deepmerge-ts` drift.
- **Prisma 7**: generator/provider + config-file breaking changes; regenerate after every schema touch (T5.1).
- **Fastify ≠ Express**: body/multipart semantics differ — test uploads early; `helmet`/`express-rate-limit` have no drop-in (use `@fastify/*`).
- **Next.js**: Zustand persist `localStorage` must be client-only; cross-port cookies fixed via `next.config` rewrites (same-origin), not CORS; Tailwind 4 in Next uses `@tailwindcss/postcss` (not `@tailwindcss/vite`).
- **Path configs**: playwright/vitest/build scripts assume root layout — fix in T1.3 or nothing goes green.
- **Shared repo**: `git status` before each sprint; only sprint files touched.
- **Secrets**: `.env*` stays git-ignored; every new env var documented in the tokens doc.

## Rollback plan

- Tag after each sprint (`sprint-N-ok`) → `git reset --hard sprint-N-ok` reverts code instantly.
- **S5**: restore pre-upgrade DB dump + revert prisma versions + regenerate client.
- **S6**: Express removed only in the T6.5 commit — reverting that single commit restores it (contract tests green first).
- **S1**: `package-lock.json` remains in git history; revert + `npm ci` restores npm flow if pnpm blocks.
- **S12**: SPA keeps serving until `sprint-12-ok`; cutover reversal = routing flag/DNS back.

---

_Generated via plan-harder. Versions verified 2026-09-25 (Next 16.3.4, React 19.3.0, Prisma 7.10.0 GA → 8.0.0-rc.1, PostgreSQL 18.6, NestJS 12, pnpm 12.6). Pro skills applied: vercel-react-best-practices (S12 rules), frontend-design (S3)._
