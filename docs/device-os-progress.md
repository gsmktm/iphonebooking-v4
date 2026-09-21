# V2 + V3 implementation progress

The complete 203-section specification remains unfinished. This continuation implements and tests additional connected workflows; it does not turn schema-only modules into completed features.

## Added in this continuation

| Workflow                    | Customer/admin UI                                            | API and database behavior                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical device identity   | Serial registry, device identity and event tables            | One identity per registered unit; safe migration of existing units; globally unique identity links; sequence-based IDs; events linked to allocation, sale, receiving, and repairs |
| Device Passport             | My Devices → Open device passport                            | Owner-filtered projection of product, masked serial, order, warranty, service history, trade-in offers, and compatible accessories                                                |
| Device risk                 | Device identity action and risk record table                 | Provider interface; unavailable external information explicitly stays UNKNOWN                                                                                                     |
| Repair parts                | Parts creation, receipt, consumption actions, movement table | Compatible-device checks, atomic quantity decrement, immutable movement and cost records                                                                                          |
| Repair quality and warranty | Structured QC form and QC/warranty tables                    | All required checks recorded; failed or stale QC blocks Ready; completion issues approved service warranty                                                                        |
| Trade-in quotes             | Customer offer-change timeline and staff inspection reason   | Versioned estimate/final offer; immutable valuation snapshots; final customer decision and audit                                                                                  |
| Procurement                 | Supplier directory, purchase orders, receiving/QC actions    | Independent approval; ordered-quantity checks; serialized receipts; provenance; stock withheld until QC; quarantine on failed QC                                                  |
| Order finance               | Order ledger and reconciliation screens                      | Charges, trade-in credits, confirmed store receipts, and expired reservation voids recorded atomically; mismatches flagged                                                        |
| V3 API hardening            | Unimplemented modules return an explicit explanation         | 82 unrestricted generated router implementations removed; legacy paths require authorization and return 501; no generic financial/history writes                                  |

Role management now supports a grouped permission editor, scoped creation/editing, and assignment. Delegated managers cannot grant or change higher privileges; own/system administrator roles are protected; changes revoke affected sessions.

Authenticated carts and wishlists now use account-scoped revision checks. Guest selections merge on login; concurrent edits require an explicit choice. Sign-out clears local account selections and private query caches. A browser journey covers migration, conflict recovery, sign-out, and switching accounts.

## Still required

- V2 gaps in [implementation status](implementation-status.md) remain except where superseded above. Live provider payments/refunds, email/SMS, full CMS/navigation, media, complete search, i18n, authentication recovery/MFA, promotions, and production deployment remain unfinished.
- Device ownership periods and resale/replacement allocation must be modeled before enabling refurbishment, resale, recycling, or retirement. Current single-purchase ownership must not be reused as if multi-owner history were complete.
- Repair BOM execution, evidence uploads, part returns, independent technician assignment UI, warranty claims, repair payment, and formal service documents still need work.
- Procurement needs partial receiving-QC decisions, supplier returns, multi-currency/freight allocation, purchasing amendments, and supplier settlement. The current supplier entity reuses the existing PartSupplier table and supports device purchases through the same supplier directory.
- Financial reconciliation currently compares internal orders, payments, and the new order ledger. Bank/gateway imports, provider fees, refunds, settlement, cash drawers, general accounting export, and retailer balances are not implemented.
- POS, scanner mode, appointments with real capacity, store queues, logistics/couriers, stocktake/bin transfers, launch command center, B2B, dealer networks, AI tools, workflow automation, forecasting, experiments, partner APIs, and operations command centers remain schema-only or absent.
- Unsupported admin definitions and navigation entries were removed. Direct links explain that the workflow is not enabled, and protected legacy APIs return 501. The remaining requirements need domain workflows and validated views before they can be enabled.

## Next dependency sequence

1. Finish transactional truth: gateway verification and refunds, settlement ingestion, physical stock reconciliation, and explicit ownership periods.
2. Extend the device lifecycle: handover consent/evidence, technician assignment, BOM/QC policies, warranty/RMA, refurbishment, resale, and retirement on the same identity.
3. Add omnichannel operations: appointment capacity, POS/cash sessions, transfers, procurement exceptions, courier/reverse logistics, corporate/dealer orders.
4. Add operational intelligence only after those sources are reliable: outbox-driven automation, risk review, price guardrails, data quality, analytics and grounded AI.
5. Complete production validation and external setup: reviewed business policies/catalog, secrets/providers, HTTPS environments, migration rehearsal, restore drill, load and accessibility review, deployment and health checks.

No completion percentage is reported: feature headings have very different effort, and the presence of a table or route does not satisfy a workflow's definition of done.
