# ADR 002: Connect domain workflows before exposing V3 scaffolds

Status: accepted for the local implementation.

## Context

The workspace gained a large V3 schema migration and 82 generated CRUD route families between development sessions. Those routers passed request bodies directly into Prisma, exposed unfiltered records, and permitted updates/deletes of historical records. Their presence did not mean their business workflows were implemented. A transaction-based canonical ID default also repeated the same number for multiple devices created in one transaction.

The existing inventory, orders, payments, ownership, and repairs already carried real relational data. Replacing them would lose continuity.

## Decision

- Keep existing migrations and data. Add reviewed bridge migrations. Associate each registered inventory unit with one canonical identity and allocate canonical numbers from a PostgreSQL sequence.
- Backfill an explicitly labelled migration event, rather than fabricate historical receiving dates or events. Reuse an existing identity if its SERIAL digest matches a registered unit. Abort on duplicate identity links; never guess how to merge conflicting devices.
- Retain a protected, explicit 501 response for legacy scaffold URLs. Remove their unused unsafe CRUD implementations. New endpoints use validation, domain permissions, constrained transitions, and transactional audit records.
- Generate customer passports directly from inventory, ownership, order, service, and quote records. Do not use the separate scaffold passport table as a second source of truth. Explicit response projections omit identifier hashes, supplier details, internal notes, and other customer identities.
- Append device events within the transaction that performs allocation, fulfillment, receiving, or service changes. Database triggers prevent updates/deletes of device events, part movements, QC results, and order money entries. Quote valuations are immutable; an offered quote permits one accept/reject decision.
- Record repair-part consumption against real compatible parts with guarded stock decrements and a cost snapshot. Require a fresh QC pass before Ready. Generate a repair warranty only after completion from the approved quotation.
- Purchase orders require another authorized approver. Serialized receipts enter QC_PENDING and affect sellable quantities only after receiving QC passes. Failed batches are quarantined.
- Use a separate typed order-money ledger with signed integer paisa. Charges are positive; applied credits, actual recorded receipts, and reservation voids reduce the balance. Reconciliation compares this ledger against order and payment records. No external settlement is claimed.

## Alternatives and trade-offs

Exposing generic CRUD for every scaffold would create pages quickly but bypass ownership boundaries and business invariants. Rewriting the entire original model would discard working migrations and relationships. The chosen additive approach keeps current orders working and makes the new supported workflows testable.

The existing Device record still represents a single purchase/ownership association, and BookingAllocation still retains its unit assignment. Multiple ownership periods, refurbishment resale, replacements, and retirement need a further migration and workflow before they can operate on the same unit. No resale workflow is enabled yet.

Stock locations for legacy units are backfilled only when a variant has exactly one location. Ambiguous units remain unlocated and cannot be allocated until reconciled. Identifiers remain digests plus masked suffixes; full IMEI/EID custody and an encrypted authorized-lookup vault remain separate work. External risk results are UNKNOWN while no registry is connected.

Existing schema-only models remain available for deliberate future migrations; they are not proof of completed functionality. Batch receiving QC is currently all-pass or quarantine-all. Partial acceptance, supplier returns, landed-cost allocation, and accounting settlement remain open.

## Validation

Integration coverage checks every legacy route family's anonymous write denial; canonical numbers within one transaction; duplicate serials; location-bound allocation; database history immutability; compatible part stock races; fresh QC after rework; independent procurement approval; inventory withheld before QC; UNKNOWN external risk; ledger reconciliation; and owner-only passports.

Browser coverage connects a customer purchase to its passport, a staff QC form, and the resulting service warranty. Future resale work must add a complete second-owner journey with explicit history privacy tests.
