# API endpoint inventory

Generated from mounted literal route declarations with `pnpm docs:generate`. It lists paths and explicit middleware, not a replacement for the authorization checks inside each handler. Array aliases, generic resource expansion and fail-closed legacy families are documented in [API.md](../API.md).

| Method | Endpoint                                                 | Explicit access boundary                  | Source                                                                          |
| ------ | -------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------- |
| GET    | `/api/v1/account/overview`                               | Signed-in account; handler enforces scope | [account.ts:7](../apps/api/server/routes/account.ts#L7)                         |
| GET    | `/api/v1/account/orders`                                 | Signed-in account; handler enforces scope | [account.ts:18](../apps/api/server/routes/account.ts#L18)                       |
| GET    | `/api/v1/account/devices`                                | Signed-in account; handler enforces scope | [account.ts:33](../apps/api/server/routes/account.ts#L33)                       |
| GET    | `/api/v1/account/notifications`                          | Signed-in account; handler enforces scope | [account.ts:45](../apps/api/server/routes/account.ts#L45)                       |
| PATCH  | `/api/v1/account/notifications/:id`                      | Signed-in account; handler enforces scope | [account.ts:53](../apps/api/server/routes/account.ts#L53)                       |
| GET    | `/api/v1/account/wishlist`                               | Signed-in account; handler enforces scope | [account.ts:60](../apps/api/server/routes/account.ts#L60)                       |
| POST   | `/api/v1/account/wishlist`                               | Signed-in account; handler enforces scope | [account.ts:68](../apps/api/server/routes/account.ts#L68)                       |
| DELETE | `/api/v1/account/wishlist/:id`                           | Signed-in account; handler enforces scope | [account.ts:80](../apps/api/server/routes/account.ts#L80)                       |
| GET    | `/api/v1/account/addresses`                              | Signed-in account; handler enforces scope | [account.ts:89](../apps/api/server/routes/account.ts#L89)                       |
| POST   | `/api/v1/account/addresses`                              | Signed-in account; handler enforces scope | [account.ts:92](../apps/api/server/routes/account.ts#L92)                       |
| GET    | `/api/v1/account/cart`                                   | Signed-in account; handler enforces scope | [account.ts:107](../apps/api/server/routes/account.ts#L107)                     |
| PUT    | `/api/v1/account/cart`                                   | Signed-in account; handler enforces scope | [account.ts:110](../apps/api/server/routes/account.ts#L110)                     |
| GET    | `/api/v1/account/tickets`                                | Signed-in account; handler enforces scope | [account.ts:125](../apps/api/server/routes/account.ts#L125)                     |
| POST   | `/api/v1/account/tickets`                                | Signed-in account; handler enforces scope | [account.ts:134](../apps/api/server/routes/account.ts#L134)                     |
| POST   | `/api/v1/account/tickets/:id/messages`                   | Signed-in account; handler enforces scope | [account.ts:148](../apps/api/server/routes/account.ts#L148)                     |
| POST   | `/api/v1/account/refunds`                                | Signed-in account; handler enforces scope | [account.ts:157](../apps/api/server/routes/account.ts#L157)                     |
| PATCH  | `/api/v1/account/profile`                                | Signed-in account; handler enforces scope | [account.ts:177](../apps/api/server/routes/account.ts#L177)                     |
| POST   | `/api/v1/admin/categories`                               | Permission: product.create                | [admin-create.ts:15](../apps/api/server/routes/admin-create.ts#L15)             |
| POST   | `/api/v1/admin/variants`                                 | Permission: product.create                | [admin-create.ts:21](../apps/api/server/routes/admin-create.ts#L21)             |
| POST   | `/api/v1/admin/inventory`                                | Permission: inventory.adjust              | [admin-create.ts:52](../apps/api/server/routes/admin-create.ts#L52)             |
| POST   | `/api/v1/admin/stores`                                   | Permission: store.update                  | [admin-create.ts:88](../apps/api/server/routes/admin-create.ts#L88)             |
| POST   | `/api/v1/admin/content`                                  | Permission: content.update                | [admin-create.ts:101](../apps/api/server/routes/admin-create.ts#L101)           |
| POST   | `/api/v1/admin/valuation-rules`                          | Permission: tradein.update                | [admin-create.ts:120](../apps/api/server/routes/admin-create.ts#L120)           |
| PATCH  | `/api/v1/admin/customers/:id/role`                       | Permission: role.manage                   | [admin-create.ts:126](../apps/api/server/routes/admin-create.ts#L126)           |
| GET    | `/api/v1/admin/dashboard`                                | Permission: report.read                   | [admin.ts:12](../apps/api/server/routes/admin.ts#L12)                           |
| GET    | `/api/v1/admin/:resource`                                | Handler-specific; see API.md              | [admin.ts:157](../apps/api/server/routes/admin.ts#L157)                         |
| POST   | `/api/v1/admin/products`                                 | Permission: product.create                | [admin.ts:537](../apps/api/server/routes/admin.ts#L537)                         |
| PATCH  | `/api/v1/admin/products/:id`                             | Permission: product.update                | [admin.ts:555](../apps/api/server/routes/admin.ts#L555)                         |
| PATCH  | `/api/v1/admin/variants/:id`                             | Permission: product.update                | [admin.ts:576](../apps/api/server/routes/admin.ts#L576)                         |
| POST   | `/api/v1/admin/inventory/:id/adjust`                     | Permission: inventory.adjust              | [admin.ts:606](../apps/api/server/routes/admin.ts#L606)                         |
| GET    | `/api/v1/admin/content/:id`                              | Permission: content.read                  | [admin.ts:656](../apps/api/server/routes/admin.ts#L656)                         |
| PATCH  | `/api/v1/admin/content/:id`                              | Permission: content.update                | [admin.ts:659](../apps/api/server/routes/admin.ts#L659)                         |
| PATCH  | `/api/v1/admin/valuation-rules/:id`                      | Permission: tradein.update                | [admin.ts:696](../apps/api/server/routes/admin.ts#L696)                         |
| GET    | `/api/v1/auth/capabilities`                              | Handler-specific; see API.md              | [auth.ts:94](../apps/api/server/routes/auth.ts#L94)                             |
| POST   | `/api/v1/auth/register`                                  | Handler-specific; see API.md              | [auth.ts:98](../apps/api/server/routes/auth.ts#L98)                             |
| POST   | `/api/v1/auth/login`                                     | Handler-specific; see API.md              | [auth.ts:128](../apps/api/server/routes/auth.ts#L128)                           |
| POST   | `/api/v1/auth/forgot-password`                           | Handler-specific; see API.md              | [auth.ts:158](../apps/api/server/routes/auth.ts#L158)                           |
| POST   | `/api/v1/auth/verification-request`                      | Handler-specific; see API.md              | [auth.ts:163](../apps/api/server/routes/auth.ts#L163)                           |
| POST   | `/api/v1/auth/reset-password`                            | Handler-specific; see API.md              | [auth.ts:168](../apps/api/server/routes/auth.ts#L168)                           |
| POST   | `/api/v1/auth/verify-email`                              | Handler-specific; see API.md              | [auth.ts:173](../apps/api/server/routes/auth.ts#L173)                           |
| GET    | `/api/v1/auth/me`                                        | Handler-specific; see API.md              | [auth.ts:178](../apps/api/server/routes/auth.ts#L178)                           |
| POST   | `/api/v1/auth/logout`                                    | Handler-specific; see API.md              | [auth.ts:179](../apps/api/server/routes/auth.ts#L179)                           |
| GET    | `/api/v1/auth/sessions`                                  | Signed-in account; handler enforces scope | [auth.ts:184](../apps/api/server/routes/auth.ts#L184)                           |
| DELETE | `/api/v1/auth/sessions/:id`                              | Signed-in account; handler enforces scope | [auth.ts:193](../apps/api/server/routes/auth.ts#L193)                           |
| POST   | `/api/v1/auth/password`                                  | Signed-in account; handler enforces scope | [auth.ts:197](../apps/api/server/routes/auth.ts#L197)                           |
| GET    | `/api/v1/config`                                         | Handler-specific; see API.md              | [catalog.ts:16](../apps/api/server/routes/catalog.ts#L16)                       |
| GET    | `/api/v1/categories`                                     | Handler-specific; see API.md              | [catalog.ts:28](../apps/api/server/routes/catalog.ts#L28)                       |
| GET    | `/api/v1/catalog`                                        | Handler-specific; see API.md              | [catalog.ts:29](../apps/api/server/routes/catalog.ts#L29)                       |
| GET    | `/api/v1/products`                                       | Handler-specific; see API.md              | [catalog.ts:34](../apps/api/server/routes/catalog.ts#L34)                       |
| GET    | `/api/v1/search`                                         | Handler-specific; see API.md              | [catalog.ts:40](../apps/api/server/routes/catalog.ts#L40)                       |
| GET    | `/api/v1/products/:slug`                                 | Handler-specific; see API.md              | [catalog.ts:121](../apps/api/server/routes/catalog.ts#L121)                     |
| GET    | `/api/v1/stores`                                         | Handler-specific; see API.md              | [catalog.ts:147](../apps/api/server/routes/catalog.ts#L147)                     |
| GET    | `/api/v1/content/:slug`                                  | Handler-specific; see API.md              | [catalog.ts:150](../apps/api/server/routes/catalog.ts#L150)                     |
| GET    | `/api/v1/articles`                                       | Handler-specific; see API.md              | [catalog.ts:157](../apps/api/server/routes/catalog.ts#L157)                     |
| POST   | `/api/v1/subscribe`                                      | Handler-specific; see API.md              | [catalog.ts:165](../apps/api/server/routes/catalog.ts#L165)                     |
| POST   | `/api/v1/events`                                         | Handler-specific; see API.md              | [catalog.ts:178](../apps/api/server/routes/catalog.ts#L178)                     |
| POST   | `/api/v1/orders`                                         | Handler-specific; see API.md              | [commerce.ts:15](../apps/api/server/routes/commerce.ts#L15)                     |
| POST   | `/api/v1/tracking`                                       | Handler-specific; see API.md              | [commerce.ts:19](../apps/api/server/routes/commerce.ts#L19)                     |
| POST   | `/api/v1/payments`                                       | Handler-specific; see API.md              | [commerce.ts:31](../apps/api/server/routes/commerce.ts#L31)                     |
| GET    | `/api/v1/payments/providers`                             | Handler-specific; see API.md              | [commerce.ts:57](../apps/api/server/routes/commerce.ts#L57)                     |
| POST   | `/api/v1/payments/status`                                | Handler-specific; see API.md              | [commerce.ts:60](../apps/api/server/routes/commerce.ts#L60)                     |
| POST   | `/api/v1/payments/:id/verify`                            | Handler-specific; see API.md              | [commerce.ts:73](../apps/api/server/routes/commerce.ts#L73)                     |
| POST   | `/api/v1/checkout/quote`                                 | Handler-specific; see API.md              | [commerce.ts:86](../apps/api/server/routes/commerce.ts#L86)                     |
| POST   | `/api/v1/payments/webhook/:provider`                     | Handler-specific; see API.md              | [commerce.ts:89](../apps/api/server/routes/commerce.ts#L89)                     |
| POST   | `/api/v1/admin/units`                                    | Permission: inventory.adjust              | [device-lifecycle.ts:10](../apps/api/server/routes/device-lifecycle.ts#L10)     |
| GET    | `/api/v1/account/devices/:id/passport`                   | Signed-in account; handler enforces scope | [device-lifecycle.ts:80](../apps/api/server/routes/device-lifecycle.ts#L80)     |
| POST   | `/api/v1/admin/device-identity/:id/risk-check`           | Permission: device.inspect                | [device-lifecycle.ts:151](../apps/api/server/routes/device-lifecycle.ts#L151)   |
| GET    | `/api/v1/admin/reconciliation`                           | Permission: payment.view                  | [finance.ts:7](../apps/api/server/routes/finance.ts#L7)                         |
| GET    | `/api/v1/home`                                           | Handler-specific; see API.md              | [home.ts:8](../apps/api/server/routes/home.ts#L8)                               |
| GET    | `/api/v1/world-prices`                                   | Handler-specific; see API.md              | [information.ts:151](../apps/api/server/routes/information.ts#L151)             |
| GET    | `/api/v1/admin/price-intelligence/options`               | Permission: product.read                  | [information.ts:227](../apps/api/server/routes/information.ts#L227)             |
| GET    | `/api/v1/admin/price-intelligence`                       | Permission: product.read                  | [information.ts:241](../apps/api/server/routes/information.ts#L241)             |
| POST   | `/api/v1/admin/price-intelligence`                       | Permission: product.update                | [information.ts:260](../apps/api/server/routes/information.ts#L260)             |
| PATCH  | `/api/v1/admin/price-intelligence/:id`                   | Permission: product.update                | [information.ts:284](../apps/api/server/routes/information.ts#L284)             |
| GET    | `/api/v1/blog`                                           | Handler-specific; see API.md              | [information.ts:331](../apps/api/server/routes/information.ts#L331)             |
| GET    | `/api/v1/blog/:slug`                                     | Handler-specific; see API.md              | [information.ts:367](../apps/api/server/routes/information.ts#L367)             |
| POST   | `/api/v1/imei-check`                                     | Handler-specific; see API.md              | [information.ts:392](../apps/api/server/routes/information.ts#L392)             |
| POST   | `/api/v1/admin/orders/:id/collect`                       | Permission: payment.collect               | [operations.ts:10](../apps/api/server/routes/operations.ts#L10)                 |
| POST   | `/api/v1/admin/orders/:id/fulfill`                       | Permission: order.fulfill                 | [operations.ts:98](../apps/api/server/routes/operations.ts#L98)                 |
| PATCH  | `/api/v1/admin/repairs/:id/status`                       | Permission: repair.update                 | [operations.ts:228](../apps/api/server/routes/operations.ts#L228)               |
| POST   | `/api/v1/admin/repairs/:id/quote`                        | Permission: repair.update                 | [operations.ts:289](../apps/api/server/routes/operations.ts#L289)               |
| PATCH  | `/api/v1/admin/trade-ins/:id/inspect`                    | Permission: tradein.update                | [operations.ts:344](../apps/api/server/routes/operations.ts#L344)               |
| POST   | `/api/v1/admin/tickets/:id/messages`                     | Permission: support.update                | [operations.ts:395](../apps/api/server/routes/operations.ts#L395)               |
| POST   | `/api/v1/admin/orders/:id/allocate`                      | Permission: order.fulfill                 | [operations.ts:405](../apps/api/server/routes/operations.ts#L405)               |
| PATCH  | `/api/v1/admin/orders/:id/status`                        | Permission: order.fulfill                 | [operations.ts:485](../apps/api/server/routes/operations.ts#L485)               |
| POST   | `/api/v1/admin/suppliers`                                | Permission: procurement.create            | [procurement.ts:21](../apps/api/server/routes/procurement.ts#L21)               |
| POST   | `/api/v1/admin/purchase-orders`                          | Permission: procurement.create            | [procurement.ts:47](../apps/api/server/routes/procurement.ts#L47)               |
| POST   | `/api/v1/admin/purchase-orders/:id/approve`              | Permission: procurement.approve           | [procurement.ts:103](../apps/api/server/routes/procurement.ts#L103)             |
| POST   | `/api/v1/admin/purchase-orders/:id/receive`              | Permission: inventory.receive             | [procurement.ts:143](../apps/api/server/routes/procurement.ts#L143)             |
| POST   | `/api/v1/admin/receipts/:id/qc`                          | Permission: inventory.qc                  | [procurement.ts:255](../apps/api/server/routes/procurement.ts#L255)             |
| GET    | `/api/v1/admin/repair-technicians`                       | Permission: repair.assign                 | [repair-assignment.ts:18](../apps/api/server/routes/repair-assignment.ts#L18)   |
| POST   | `/api/v1/admin/repairs/:id/assign`                       | Permission: repair.assign                 | [repair-assignment.ts:42](../apps/api/server/routes/repair-assignment.ts#L42)   |
| POST   | `/api/v1/admin/parts`                                    | Permission: inventory.adjust              | [repair-operations.ts:10](../apps/api/server/routes/repair-operations.ts#L10)   |
| POST   | `/api/v1/admin/parts/:id/receive`                        | Permission: inventory.adjust              | [repair-operations.ts:43](../apps/api/server/routes/repair-operations.ts#L43)   |
| POST   | `/api/v1/admin/repairs/:id/parts`                        | Permission: repair.update                 | [repair-operations.ts:76](../apps/api/server/routes/repair-operations.ts#L76)   |
| GET    | `/api/v1/admin/repairs/qc-checklist`                     | Permission: repair.read                   | [repair-operations.ts:156](../apps/api/server/routes/repair-operations.ts#L156) |
| POST   | `/api/v1/admin/repairs/:id/qc`                           | Permission: repair.qc                     | [repair-operations.ts:159](../apps/api/server/routes/repair-operations.ts#L159) |
| GET    | `/api/v1/retailer-network`                               | Handler-specific; see API.md              | [retailer.ts:53](../apps/api/server/routes/retailer.ts#L53)                     |
| GET    | `/api/v1/retailer-applications`                          | Signed-in account; handler enforces scope | [retailer.ts:79](../apps/api/server/routes/retailer.ts#L79)                     |
| POST   | `/api/v1/retailer-applications`                          | Signed-in account; handler enforces scope | [retailer.ts:87](../apps/api/server/routes/retailer.ts#L87)                     |
| GET    | `/api/v1/retailer/memberships`                           | Signed-in account; handler enforces scope | [retailer.ts:134](../apps/api/server/routes/retailer.ts#L134)                   |
| GET    | `/api/v1/retailer/:retailerId`                           | Signed-in account; handler enforces scope | [retailer.ts:149](../apps/api/server/routes/retailer.ts#L149)                   |
| GET    | `/api/v1/retailer/:retailerId/inventory`                 | Signed-in account; handler enforces scope | [retailer.ts:158](../apps/api/server/routes/retailer.ts#L158)                   |
| POST   | `/api/v1/retailer/:retailerId/inventory/:stockId/adjust` | Signed-in account; handler enforces scope | [retailer.ts:214](../apps/api/server/routes/retailer.ts#L214)                   |
| GET    | `/api/v1/retailer/:retailerId/orders`                    | Signed-in account; handler enforces scope | [retailer.ts:313](../apps/api/server/routes/retailer.ts#L313)                   |
| GET    | `/api/v1/retailer/:retailerId/members`                   | Signed-in account; handler enforces scope | [retailer.ts:356](../apps/api/server/routes/retailer.ts#L356)                   |
| POST   | `/api/v1/retailer/:retailerId/members`                   | Signed-in account; handler enforces scope | [retailer.ts:371](../apps/api/server/routes/retailer.ts#L371)                   |
| PATCH  | `/api/v1/retailer/:retailerId/members/:memberId`         | Signed-in account; handler enforces scope | [retailer.ts:423](../apps/api/server/routes/retailer.ts#L423)                   |
| GET    | `/api/v1/admin/retailer-applications`                    | Permission: retailer.read                 | [retailer.ts:451](../apps/api/server/routes/retailer.ts#L451)                   |
| GET    | `/api/v1/admin/retailer-stores`                          | Permission: retailer.manage               | [retailer.ts:471](../apps/api/server/routes/retailer.ts#L471)                   |
| POST   | `/api/v1/admin/retailer-applications/:id/review`         | Permission: retailer.manage               | [retailer.ts:489](../apps/api/server/routes/retailer.ts#L489)                   |
| POST   | `/api/v1/admin/retailers/:retailerId/stores`             | Permission: retailer.manage               | [retailer.ts:612](../apps/api/server/routes/retailer.ts#L612)                   |
| GET    | `/api/v1/products/:slug/reviews`                         | Handler-specific; see API.md              | [reviews.ts:18](../apps/api/server/routes/reviews.ts#L18)                       |
| POST   | `/api/v1/products/:slug/reviews`                         | Signed-in account; handler enforces scope | [reviews.ts:55](../apps/api/server/routes/reviews.ts#L55)                       |
| GET    | `/api/v1/admin/reviews`                                  | Permission: review.read                   | [reviews.ts:106](../apps/api/server/routes/reviews.ts#L106)                     |
| PATCH  | `/api/v1/admin/reviews/:id`                              | Permission: review.moderate               | [reviews.ts:136](../apps/api/server/routes/reviews.ts#L136)                     |
| GET    | `/api/v1/admin/permission-catalog`                       | Permission: role.read                     | [roles.ts:14](../apps/api/server/routes/roles.ts#L14)                           |
| POST   | `/api/v1/admin/roles`                                    | Permission: role.manage                   | [roles.ts:15](../apps/api/server/routes/roles.ts#L15)                           |
| PATCH  | `/api/v1/admin/roles/:id`                                | Permission: role.manage                   | [roles.ts:36](../apps/api/server/routes/roles.ts#L36)                           |
| GET    | `/api/v1/trade-in/rules`                                 | Handler-specific; see API.md              | [services.ts:16](../apps/api/server/routes/services.ts#L16)                     |
| POST   | `/api/v1/trade-in/quote`                                 | Handler-specific; see API.md              | [services.ts:21](../apps/api/server/routes/services.ts#L21)                     |
| GET    | `/api/v1/trade-ins`                                      | Signed-in account; handler enforces scope | [services.ts:32](../apps/api/server/routes/services.ts#L32)                     |
| POST   | `/api/v1/trade-ins`                                      | Signed-in account; handler enforces scope | [services.ts:56](../apps/api/server/routes/services.ts#L56)                     |
| POST   | `/api/v1/trade-ins/:id/decision`                         | Signed-in account; handler enforces scope | [services.ts:88](../apps/api/server/routes/services.ts#L88)                     |
| GET    | `/api/v1/repairs`                                        | Signed-in account; handler enforces scope | [services.ts:132](../apps/api/server/routes/services.ts#L132)                   |
| GET    | `/api/v1/repairs/:id`                                    | Signed-in account; handler enforces scope | [services.ts:142](../apps/api/server/routes/services.ts#L142)                   |
| POST   | `/api/v1/repairs`                                        | Signed-in account; handler enforces scope | [services.ts:157](../apps/api/server/routes/services.ts#L157)                   |
| POST   | `/api/v1/repairs/:id/quotes/:quoteId/decision`           | Signed-in account; handler enforces scope | [services.ts:187](../apps/api/server/routes/services.ts#L187)                   |
| GET    | `/api/v1/account/shop-state`                             | Signed-in account; handler enforces scope | [shop-state.ts:8](../apps/api/server/routes/shop-state.ts#L8)                   |
| PUT    | `/api/v1/account/shop-state`                             | Signed-in account; handler enforces scope | [shop-state.ts:46](../apps/api/server/routes/shop-state.ts#L46)                 |
