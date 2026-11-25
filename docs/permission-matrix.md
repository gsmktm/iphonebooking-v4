# Implemented permission inventory

Derived from the permission catalog and mounted handlers. Roles store a list of these permissions; `*` is restricted to existing super administrators. [ADMIN.md](../ADMIN.md) explains read/write separation and independent approval.

| Permission            | Explicit endpoint uses                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `product.read`        | `/api/v1/admin/price-intelligence/options`, `/api/v1/admin/price-intelligence`                                                                   |
| `product.create`      | `/api/v1/admin/categories`, `/api/v1/admin/variants`, `/api/v1/admin/products`                                                                   |
| `product.update`      | `/api/v1/admin/products/:id`, `/api/v1/admin/variants/:id`, `/api/v1/admin/price-intelligence`, `/api/v1/admin/price-intelligence/:id`           |
| `inventory.read`      | Generic resource map or service guard; inspect the source                                                                                        |
| `inventory.adjust`    | `/api/v1/admin/inventory`, `/api/v1/admin/inventory/:id/adjust`, `/api/v1/admin/units`, `/api/v1/admin/parts`, `/api/v1/admin/parts/:id/receive` |
| `inventory.receive`   | `/api/v1/admin/purchase-orders/:id/receive`                                                                                                      |
| `inventory.qc`        | `/api/v1/admin/receipts/:id/qc`                                                                                                                  |
| `order.read`          | Generic resource map or service guard; inspect the source                                                                                        |
| `order.fulfill`       | `/api/v1/admin/orders/:id/fulfill`, `/api/v1/admin/orders/:id/allocate`, `/api/v1/admin/orders/:id/status`                                       |
| `payment.view`        | `/api/v1/admin/reconciliation`                                                                                                                   |
| `payment.collect`     | `/api/v1/admin/orders/:id/collect`                                                                                                               |
| `repair.read`         | `/api/v1/admin/repairs/qc-checklist`                                                                                                             |
| `repair.update`       | `/api/v1/admin/repairs/:id/status`, `/api/v1/admin/repairs/:id/quote`, `/api/v1/admin/repairs/:id/parts`                                         |
| `repair.assign`       | `/api/v1/admin/repair-technicians`, `/api/v1/admin/repairs/:id/assign`                                                                           |
| `repair.qc`           | `/api/v1/admin/repairs/:id/qc`                                                                                                                   |
| `tradein.read`        | Generic resource map or service guard; inspect the source                                                                                        |
| `tradein.update`      | `/api/v1/admin/valuation-rules`, `/api/v1/admin/valuation-rules/:id`, `/api/v1/admin/trade-ins/:id/inspect`                                      |
| `customer.read`       | Generic resource map or service guard; inspect the source                                                                                        |
| `store.read`          | Generic resource map or service guard; inspect the source                                                                                        |
| `store.update`        | `/api/v1/admin/stores`                                                                                                                           |
| `retailer.read`       | `/api/v1/admin/retailer-applications`                                                                                                            |
| `retailer.manage`     | `/api/v1/admin/retailer-stores`, `/api/v1/admin/retailer-applications/:id/review`, `/api/v1/admin/retailers/:retailerId/stores`                  |
| `content.read`        | `/api/v1/admin/content/:id`                                                                                                                      |
| `content.update`      | `/api/v1/admin/content`, `/api/v1/admin/content/:id`                                                                                             |
| `review.read`         | `/api/v1/admin/reviews`                                                                                                                          |
| `review.moderate`     | `/api/v1/admin/reviews/:id`                                                                                                                      |
| `support.read`        | Generic resource map or service guard; inspect the source                                                                                        |
| `support.update`      | `/api/v1/admin/tickets/:id/messages`                                                                                                             |
| `role.read`           | `/api/v1/admin/permission-catalog`                                                                                                               |
| `role.manage`         | `/api/v1/admin/customers/:id/role`, `/api/v1/admin/roles`, `/api/v1/admin/roles/:id`                                                             |
| `audit.read`          | Generic resource map or service guard; inspect the source                                                                                        |
| `system.read`         | Generic resource map or service guard; inspect the source                                                                                        |
| `report.read`         | `/api/v1/admin/dashboard`                                                                                                                        |
| `device.read`         | Generic resource map or service guard; inspect the source                                                                                        |
| `device.inspect`      | `/api/v1/admin/device-identity/:id/risk-check`                                                                                                   |
| `procurement.read`    | Generic resource map or service guard; inspect the source                                                                                        |
| `procurement.create`  | `/api/v1/admin/suppliers`, `/api/v1/admin/purchase-orders`                                                                                       |
| `procurement.approve` | `/api/v1/admin/purchase-orders/:id/approve`                                                                                                      |
