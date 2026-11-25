---
name: debug-and-verify
description: Find root causes, reproduce failures, add behavioral regression tests and verify results.
---
# debug and verify

Trigger: failing CI, unexpected API behavior, data races and regressions.

1. Pin current branch, commit, environment, exact command and error output.
2. Reproduce the failure in an isolated environment; trace React → API → auth → Prisma transaction → PostgreSQL.
3. Form a falsifiable root-cause hypothesis and write a test at a public behavior boundary.
4. Apply a surgical correction, not a speculative rewrite. Do not hide errors or disable audits.
5. Run affected tests, lint, typecheck, build and dependency audit with fresh exit codes.
6. Report PASS, FAIL or NOT RUN; no success claims from syntax checking alone.

Inspired by mattpocock/skills code-review and TDD, obra/superpowers systematic-debugging and verification-before-completion, and multica-ai/andrej-karpathy-skills surgical changes.
