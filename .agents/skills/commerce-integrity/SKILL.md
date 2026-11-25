---
name: commerce-integrity
description: Protect price authority, inventory reservations, payment verification, refunds, trade-in and repairs.
---
# commerce integrity

Trigger: checkout, cart, deposits, stock, payment callbacks, trade-in or repair changes.

- Prices and deposits are authoritative on the server and stored as integer paisa; NPR is presentation.
- Inventory reservation and allocation must conserve stock under concurrent transactions.
- A gateway redirect is not proof of settlement; verify signed evidence and reconcile server-side.
- Idempotency keys and unique payment evidence prevent repeated charges or double reservations.
- Preserve append-only audit/finance/device history, explicit approval and tenant ownership.
- Do not invent prices, reviews, delivery dates or customer records.

Use disposable *_test databases and test guest/account checkout, racing final units, expired reservations, duplicate callbacks, wrong-user access and quote decisions. Influenced by ECC security and database migration guidance, obra/superpowers TDD and addyosmani/agent-skills.
