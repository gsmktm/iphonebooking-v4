# API reference and role matrix

All business endpoints begin with `/api/v1`. Mutations use JSON and `X-Requested-With: iPhoneBooking`; browser requests must come from `APP_ORIGIN`. Authentication uses the session cookie. Errors have `{error:{code,message,requestId}}`. API responses are `Cache-Control: no-store`.

| Area             | Endpoints                                                                                                        | Access                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Health           | `GET /api/health`                                                                                                | Public; includes database readiness                              |
| Catalog          | `GET /categories`, `/products`, `/products/:slug`                                                                | Public                                                           |
| Search/filter    | `/products?q=&category=&storage=&color=&stock=in-stock&sort=`                                                    | Name/SKU search; 100-record result limit                         |
| Stores/content   | `GET /stores`, `/content/:slug`, `/articles`                                                                     | Published public data                                            |
| Newsletter       | `POST /subscribe`                                                                                                | Email + explicit consent; stores preference only                 |
| Analytics        | `POST /events`                                                                                                   | Allowlisted event names, optional entity ID; no PII payload      |
| Authentication   | `POST /auth/register`, `/auth/login`, `/auth/logout`                                                             | Rate limited                                                     |
| Session          | `GET /auth/me`, `/auth/sessions`; `DELETE /auth/sessions/:id`                                                    | Own session/account only                                         |
| Password         | `POST /auth/password`                                                                                            | Current password required; revokes other sessions                |
| Checkout         | `POST /orders`                                                                                                   | Guest/account; server totals; terms acceptance; idempotency UUID |
| Tracking         | `POST /tracking`                                                                                                 | Order number + private receipt key; status only                  |
| Guest claim      | `POST /account/claim-order`                                                                                      | Signed in + private receipt key                                  |
| Payment          | `POST /payments`, `/payments/webhook/:provider`                                                                  | Unconfigured adapters return 503                                 |
| Account          | `GET /account/overview`, `/orders`, `/devices`, `/notifications`, `/addresses`, `/wishlist`, `/cart`, `/tickets` | Own records only                                                 |
| Profile          | `PATCH /account/profile`                                                                                         | Name only; email change needs a verification workflow            |
| Cart             | `PUT /account/cart`                                                                                              | Validated configuration IDs and quantities                       |
| Wishlist         | `POST /account/wishlist`; `DELETE /account/wishlist/:id`                                                         | Own records; UI currently uses local wishlist                    |
| Address          | `POST /account/addresses`                                                                                        | Own addresses                                                    |
| Notifications    | `PATCH /account/notifications/:id`                                                                               | Mark own notification read                                       |
| Tickets          | `POST /account/tickets`, `/account/tickets/:id/messages`                                                         | Own thread; private staff notes omitted                          |
| Refund intake    | `POST /account/refunds`                                                                                          | Confirmed own payment, one full request per payment              |
| Trade-in         | `GET /trade-in/rules`; `POST /trade-in/quote`                                                                    | Public indicative estimate                                       |
| Trade-in request | `GET/POST /trade-ins`; `POST /trade-ins/:id/decision`                                                            | Own request and inspected offer                                  |
| Repairs          | `GET/POST /repairs`; `POST /repairs/:id/quotes/:quoteId/decision`                                                | Own request/device; pending quote only                           |

## Checkout payload

```json
{
  "items": [{ "variantId": "DATABASE_VARIANT_ID", "quantity": 1 }],
  "name": "Customer name",
  "email": "customer@example.com",
  "phone": "9800000000",
  "fulfillment": "PICKUP",
  "address": {
    "province": "Bagmati",
    "district": "",
    "municipality": "",
    "ward": "",
    "area": "",
    "landmark": ""
  },
  "idempotencyKey": "CLIENT_GENERATED_UUID",
  "termsAccepted": true
}
```

Delivery requires the address fields. `tradeInId` may reference a currently accepted inspected offer. All sums come from database prices. An existing idempotency key returns 409 without creating another reservation; exact response replay/recovery for lost guest receipts is not implemented. Keep the private receipt key returned by the first successful response.

## Administration

`GET /admin/dashboard` returns actual aggregates. `GET /admin/:resource?page=1&q=` returns `{rows,total,page,pageSize}` with 50 rows per page. Products, variants, orders, and customers support database search; other tables provide explicitly labeled filtering of the current page. CSV export covers the displayed page; customer bulk export is not enabled.

Creation routes exist for products, categories, variants, inventory stock, stores, CMS pages, valuation rules, and physical serials. Updates exist for product details, configuration prices, CMS content, and valuation rules. Product creation is followed by configuration creation and inventory receipt; it does not invent stock.

| Operation                 | Endpoint                                                           | Permission                                           |
| ------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------- |
| Read catalog              | `/admin/products`, `/categories`, `/variants`                      | `product.read`                                       |
| Create catalog            | `POST /admin/products`, `/categories`, `/variants`                 | `product.create`                                     |
| Update catalog            | `PATCH /admin/products/:id`, `/variants/:id`                       | `product.update`                                     |
| Stock receipt/adjustment  | `POST /admin/inventory`, `/inventory/:id/adjust`, `/units`         | `inventory.adjust`                                   |
| Read stock/ledger/serials | `/admin/inventory`, `/inventory-ledger`, `/units`                  | `inventory.read`                                     |
| Store payment             | `POST /admin/orders/:id/collect`                                   | `payment.collect`                                    |
| Physical allocation       | `POST /admin/orders/:id/allocate`                                  | `order.fulfill`                                      |
| Fulfillment stage         | `PATCH /admin/orders/:id/status`                                   | `order.fulfill`                                      |
| Device handover           | `POST /admin/orders/:id/fulfill`                                   | `order.fulfill`                                      |
| Repair stage/quote        | `PATCH /admin/repairs/:id/status`; `POST /admin/repairs/:id/quote` | `repair.update`                                      |
| Trade-in inspection       | `PATCH /admin/trade-ins/:id/inspect`                               | `tradein.update`                                     |
| Content                   | `POST /admin/content`; `PATCH /admin/content/:id`                  | `content.update`                                     |
| Staff support note/reply  | `POST /admin/tickets/:id/messages`                                 | `support.update`                                     |
| Role assignment           | `PATCH /admin/customers/:id/role`                                  | `role.manage`; self-change blocked, sessions revoked |

Seed roles: Super Admin (`*`), Content Manager, Technician, Finance, and Inventory Manager. Permissions are string arrays on the role and enforced in the server. Additional role templates and a grouped permission editor are implemented; all grants remain bounded by the acting staff member’s permissions. Audit logs have no edit or delete API.

## Device OS domain endpoints

All mutations still require the same session and CSRF/origin protections. Amounts are integer paisa. Unsupported generated camelCase routes require authorization and return `501 WORKFLOW_NOT_IMPLEMENTED`; they never expose generic CRUD.

| Method / path (under `/api/v1`)              | Permission / scope    | Behavior                                                                                                                      |
| -------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `POST /admin/units`                          | `inventory.adjust`    | Register a serial against received stock; infer location only when unambiguous; create canonical identity and receiving event |
| `GET /account/devices/:id/passport`          | Owner only            | Live projection with masked identifiers and customer-visible history                                                          |
| `POST /admin/device-identity/:id/risk-check` | `device.inspect`      | Record provider result; current external result is UNKNOWN                                                                    |
| `POST /admin/parts`                          | `inventory.adjust`    | Create part with product compatibility; zero initial stock                                                                    |
| `POST /admin/parts/:id/receive`              | `inventory.adjust`    | Receive quantity and unit cost with a unique reference                                                                        |
| `POST /admin/repairs/:id/parts`              | `repair.update`       | Consume available compatible parts against an approved repair                                                                 |
| `GET /admin/repairs/qc-checklist`            | `repair.read`         | Required functional check names                                                                                               |
| `POST /admin/repairs/:id/qc`                 | `repair.qc`           | Append complete pass/fail checklist during QUALITY_CONTROL                                                                    |
| `PATCH /admin/trade-ins/:id/inspect`         | `tradein.update`      | Requires finalValue and a customer-visible reason; records Q2                                                                 |
| `POST /admin/suppliers`                      | `procurement.create`  | Create purchasing contact                                                                                                     |
| `POST /admin/purchase-orders`                | `procurement.create`  | Create validated quantity/cost lines against known variants                                                                   |
| `POST /admin/purchase-orders/:id/approve`    | `procurement.approve` | Requires a different staff member and reason                                                                                  |
| `POST /admin/purchase-orders/:id/receive`    | `inventory.receive`   | Receive approved quantities into QC_PENDING with provenance                                                                   |
| `POST /admin/receipts/:id/qc`                | `inventory.qc`        | Accept the whole receipt or quarantine it; accepted units add sellable stock once                                             |
| `GET /admin/order-ledger`                    | `payment.view`        | Paginated immutable order money entries                                                                                       |
| `GET /admin/reconciliation`                  | `payment.view`        | Paginated internal order/payment/ledger comparisons                                                                           |
| `GET /admin/permission-catalog`              | `role.read`           | Supported assignable permission names                                                                                         |
| `POST /admin/roles`                          | `role.manage`         | Create a role within the actor's grantable permissions                                                                        |
| `PATCH /admin/roles/:id`                     | `role.manage`         | Edit an eligible role and revoke affected sessions                                                                            |
| `PATCH /admin/customers/:id/role`            | `role.manage`         | Assign/remove a grantable role and revoke sessions                                                                            |

Supported paginated admin read modules added: `device-identity`, `device-event`, `device-risk-check`, `parts`, `part-movements`, `repair-qc`, `repair-warranty`, `trade-in-quote`, `suppliers`, `purchase-orders`, and `receipts`. Other V3 schema-only modules remain unavailable.

## Saved shopping selections

`GET /api/v1/account/shop-state` requires a session and returns `accountId`, `revision`, hydrated cart lines, and wishlist product IDs. `PUT` accepts `{ accountId, revision, cart: [{ variantId, quantity }], wishlist: [productId] }` and atomically replaces the selection only at the expected revision. The response returns the new revision.

A stale revision returns `409 SHOP_STATE_CHANGED`; a different signed-in account returns `409 ACCOUNT_CHANGED`. The client must load the saved selection or explicitly confirm keeping its local selection before retrying. A conflict must never be handled by unconditional background overwrite. Existing cart/wishlist endpoints increment the same revision for compatibility. Neither saved cart prices nor availability establish checkout pricing or reserve inventory.

## Repair assignment

- `GET /api/v1/admin/repair-technicians?q=...` requires `repair.assign` and returns at most 50 staff with repair work permission, their role name, and current assigned workload. Search by name; staff email and credential fields are excluded.
- `POST /api/v1/admin/repairs/:id/assign` requires `repair.assign` and accepts `{ technicianId, expectedTechnicianId: string | null, reason }`. The expected current assignee protects against stale edits. The transaction validates staff eligibility and service stage, writes the assignment and immutable history, and records an audit entry.
- `PATCH /api/v1/admin/repairs/:id/status` no longer accepts `technician`. Assignment requires the dedicated permission even if the actor may update repair stages.
- With `REQUIRE_INDEPENDENT_REPAIR_QC=true`, QC blocks both current and historical assignees. Legacy names that were not safely mapped to staff IDs return `LEGACY_ASSIGNMENT_REVIEW_REQUIRED`.
