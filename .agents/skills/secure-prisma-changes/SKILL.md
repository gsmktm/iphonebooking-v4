---
name: secure-prisma-changes
description: Apply strict API input, authorization, secret and database migration safeguards.
---
# secure prisma changes

Trigger: Express/Zod routes, authentication, roles, webhook integrations, Prisma schema and migration SQL.

1. Map input validation, CSRF/origin, rate limits, role ownership, tenant boundaries and private data paths.
2. Validate with Zod and authorize resources server-side; test negative cases, not only success.
3. Never put .env, credentials, raw PII, customer serials or payment tokens into code or logs.
4. Migrate with forward-only reviewed SQL and safe expand/contract; back up and test on disposable copies.
5. Regenerate and commit pnpm-lock.yaml alongside dependency upgrades. Keep audit enabled.
6. Publish compatibility, rollback, observability and verification notes.

Never auto-enable third-party agent hooks or MCP privileges. Inspired by affaan-m/ECC security-review/database-migrations and addyosmani security-and-hardening.
