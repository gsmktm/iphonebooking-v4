# Curated and revision-pinned external engineering skills

Snapshot: 26 November 2026. Scope: gsmktm/iphonebooking-v4. These sources are reviewed methodology references, **not installed third-party runtime code or executable hooks**. The five project SKILL.md files are original adaptations.

| Source pinned for review | Practices selected |
| --- | --- |
| [mattpocock/skills](https://github.com/mattpocock/skills/tree/6f7f7831a625f040a8e06a0e7954826b87ce775a) | TDD, standards/spec review |
| [obra/superpowers](https://github.com/obra/superpowers/tree/22f0b463e7a5e579904dd6211a520321035526f7) | Root-cause debugging, verification |
| [affaan-m/ECC](https://github.com/affaan-m/ECC/tree/4adeee6732a12d1540f49a4d50a38ce8c97f9a53) | Security, database migrations, browser QA, delivery gates |
| [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills/tree/2c606141936f1eeef17fa3043a72095b4765b9c2) | Minimal, surgical code changes |
| [anthropics/skills](https://github.com/anthropics/skills/tree/e4bb5d960d87126ff3b3a8af1a104b7db67560ba) | Frontend design and skill authoring |
| [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/tree/8db36338810d0942567b97ce439affd1619fcf31) | Responsive design research |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills/tree/e997ac5b9a74eab332d5e9793bb38a38c8cfdd74) | CI/CD, security, incremental implementation |
| [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill/tree/d1a2bb41d927083ac7118f60cfc9cdf711810ea0) | Editorial UI restraint, browser checks |

## Deferred or not applicable as direct application dependencies

Dify, LobeHub, awesome-llm-apps, deer-flow, and OpenMontage are independent app/agent/video runtimes; Graphify and Archify are optional code analysis tools; cc-switch is a local desktop utility; JavaGuide, 30-seconds-of-code and app-ideas are learning references. None should be installed in the checkout application merely to maximize skill count.

## Adding or upgrading a skill

Define a concrete unmet use case; inspect upstream license, pinned commit, dependencies, network actions, hooks and security implications; write a scoped local SKILL.md; run pnpm skills:verify and complete CI; require peer review before any executable integration. Customer data, payments, migrations, publication and deployment remain separately authorized.

## Evidence

The GitHub CI run [45676699387](https://github.com/gsmktm/iphonebooking-v4/actions/runs/45676699387) on commit 3de0d2d0715ed1cf07047a16e0dae52de5154f08 passed installation, migrations, lint, typecheck, tests and build, then failed dependency security audit (3 high, 7 moderate, 1 low). This review branch remediates those advisories and must pass fresh CI before merging.
