---
name: release-gates
description: Require safe CI, audited dependencies, staging and explicit approvals before release.
---
# release gates

Trigger: package upgrades, CI, Docker, Vercel, DB migrations, deployment and background worker changes.

1. Pin exact repo/team/branch/commit and inspect real CI logs before making changes.
2. Remediate vulnerable dependencies with compatible patched versions and a frozen lockfile; never bypass pnpm audit.
3. Run pnpm install --frozen-lockfile, Prisma generate/migrate/validate, skills:verify, lint, typecheck, tests, build and security audit.
4. Test browser and API smoke checks on staging with a *_test database, then verify backups and rollback.
5. Validate HTTPS origins, production secret management, payment reconciliation, worker supervision, customer privacy and merchant inventory.
6. Promote only with explicit production approval; never call a static Vite frontend a complete Express/PostgreSQL/worker deployment.

Influenced by obra/superpowers verification-before-completion, ECC delivery-gate, addyosmani ci-cd-and-automation, and mattpocock/skills code review.
