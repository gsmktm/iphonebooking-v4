# Administration

Open `/admin` and sign in using the private account configured in your local environment. Credentials are neither shared defaults nor documented here. The administrative interface reads database metrics and uses explicit business actions; viewing a table is not permission to mutate its records.

## Supported operating areas

| Area                                 | Read permission                      | Principal write permission / action                                                       |
| ------------------------------------ | ------------------------------------ | ----------------------------------------------------------------------------------------- |
| Dashboard                            | `report.read`                        | Read-only recorded totals; development fixtures affect local metrics                      |
| Products/categories/variants         | `product.read`                       | `product.create`, `product.update`; edits and price changes are audited                   |
| Inventory/serial registry            | `inventory.read`                     | `inventory.adjust`, `inventory.receive`, `inventory.qc`; movement reason and state checks |
| Orders/bookings                      | `order.read`                         | `order.fulfill`; allocation, staged fulfillment and physical unit checks                  |
| Payments/order ledger/reconciliation | `payment.view`                       | `payment.collect`; unique store receipt, balance and unresolved-provider checks           |
| Repairs/parts/QC/warranty            | `repair.read`, `inventory.read`      | `repair.update`, `repair.assign`, `repair.qc`; customer approval precedes work            |
| Trade-ins/valuation                  | `tradein.read`                       | `tradein.update`; inspected/versioned offer and customer decision                         |
| Purchasing/suppliers/receipts        | `procurement.read`, `inventory.read` | `procurement.create`, `procurement.approve`, receiving/QC permissions                     |
| Retailer applications/stores         | `retailer.read`                      | `retailer.manage`; approval and store tenancy                                             |
| CMS/journal                          | `content.read`                       | `content.update`; validated blocks, publication and revision conflict handling            |
| Customer reviews                     | `review.read`                        | `review.moderate`; independent decision, reason and expected revision                     |
| Customers/roles                      | `customer.read`, `role.read`         | `role.manage`; no granting permissions beyond the actor's own scope                       |
| Support/notifications                | `support.read`                       | `support.update`; private staff notes stay out of customer responses                      |
| Audit/jobs                           | `audit.read`, `system.read`          | Read-only operational evidence; unsupported job handlers do not pretend to succeed        |

The complete 38-permission [inventory](docs/permission-matrix.md) is generated from `services/permissions.ts`. Tenant member roles are a separate scope checked in retailer services. Every protected endpoint enforces permissions on the server; hidden navigation is supplementary.

## Role policy

Development templates include Super Admin, Content Manager, Technician, Repair Manager, Quality Inspector, Procurement Officer, Procurement Approver, Finance and Inventory Manager. Existing role permissions are never silently overwritten by seeding. The role editor uses the permission catalog; account role changes invalidate sessions. Grant review permissions to an appropriate moderator through this protected workflow rather than rerunning a seed against business records.

Procurement creator and approver must differ. Review authors cannot moderate their own submissions. Independent repair/receiving QC can be enabled through deployment flags; repair QC excludes current and former assigned technicians when required. Full MFA, approval budgets and formal staff operating policies remain launch decisions.

## CMS workflow

Create or edit the `home` content page. The first hero block supplies title, introduction and primary destination. Section blocks select one of fourteen unique section keys and customize its heading, description and supported destination. New keys are `spotlights`, `finder` and `saved`. Uncheck **Show this section on the homepage** to hide any keyed section; missing visibility flags preserve existing behavior. Trade-in and repair visibility are independent. The hero discovery link follows the first available device section, falling back to the store.

The homepage preserves its designed sequence. CMS page blocks can be moved with labeled up/down controls and removed with recovery. Conflicting updates preserve the draft rather than overwrite another editor's changes. Product spotlights use each product's own detail/configuration destinations; the finder opens its selection dialog.

Journal entries use `blog-` slugs and appear only when published. Policy/support/company pages use the supported content routes. Internal URLs reject protocol-relative destinations, backslashes and control characters. Navigation, footer, arbitrary media upload and versioned policy publishing remain unimplemented.

## Review workflow

Customers can submit once per product after delivery. Open `/admin/reviews`, inspect the complete review, then publish or reject with a reason. The action includes the current revision; stale decisions require reloading. Publication never rewrites customer text. Ratings and counts reflect published reviews only; no reviews are seeded.

Tables use server pagination and explicit search where supported; review lists use 25 rows and ordinary lists use 50. CSV export contains the current permitted page, not an unbounded background report. Sensitive identifiers stay masked. Enterprise reports, bank settlements, provider refund execution, promotions and scaffold-only modules are not presented as completed operations.
