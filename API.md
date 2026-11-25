# API contract

The same-origin REST API is rooted at `/api/v1`. The [generated endpoint inventory](docs/api-endpoint-matrix.md) lists 130 mounted literal routes with explicit middleware and source locations. Dynamic admin resources, aliases and guarded legacy families expand that inventory. Read handler-level ownership/tenant checks before adding a caller.

## Request and response rules

Browser sessions use an opaque HttpOnly cookie. Mutations must send `X-Requested-With: iPhoneBooking`; a supplied `Origin` must match the configured application/public/admin origins. The web API client supplies these controls and cookies. There is no unrestricted cross-origin API.

Bodies are limited to 256 KB. Zod validates inputs. Money uses integer paisa; dates use ISO strings. Errors use `{ "error": { "code", "message", "requestId" } }`. Common statuses are 401 sign-in required, 403 access denied, 404 missing or inaccessible record, 409 stale/duplicate/conflicting action, 422 validation, 429 rate limited, 503 unconfigured/unavailable integration and 501 unsupported workflow. Do not convert an integration failure into success UI.

| Family             | Principal endpoints                                                                                                           | Boundary                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Catalog            | `GET /catalog`, `/products`, `/products/:slug`, `/categories`, `/search`, `/stores`                                           | Public active catalog and public store projection                                                          |
| Homepage/editorial | `GET /home`, `/content/:slug`, `/blog`, `/blog/:slug`, `/articles`                                                            | Published content only; bounded homepage composition                                                       |
| Quote/reservation  | `POST /checkout/quote`, `/orders`                                                                                             | Server prices, stock, fulfillment, policies and credit; private key required for idempotent receipt replay |
| Tracking           | `POST /tracking`                                                                                                              | Order number and private receipt key                                                                       |
| Payments           | `GET /payments/providers`; `POST /payments`, `/payments/status`, `/payments/:id/verify`                                       | Owned order or its private receipt key; provider evidence verified on server                               |
| Authentication     | `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/capabilities`                                             | Secure session, suspension and rate-limit checks                                                           |
| Account recovery   | `/auth/forgot-password`, `/auth/verification-request`, `/auth/reset-password`, `/auth/verify-email`                           | Single-use expiring tokens; mail capabilities fail closed                                                  |
| Account            | `/account/orders`, `/devices`, `/overview`, `/profile`, `/addresses`, `/notifications`, `/tickets`, `/refunds`, `/shop-state` | Signed-in owner; shopping writes check account/revision                                                    |
| Device passport    | `GET /account/devices/:id/passport`                                                                                           | Owned device only; no customer access to full identifiers/private notes                                    |
| Trade-in           | `/trade-in/rules`, `/trade-in/quote`, `/trade-ins`, `/trade-ins/:id/decision`                                                 | Public estimate; owned requests and final offer decisions                                                  |
| Repairs            | `/repairs`, `/repairs/:id`, `/repairs/:id/quotes/:quoteId/decision`                                                           | Owner-only intake/history/approval; technician assignments omitted publicly                                |
| Reviews            | `GET/POST /products/:slug/reviews`                                                                                            | Published public list; signed-in delivered-purchase submission                                             |
| Retailer           | `/retailer-applications`, `/retailer/memberships`, `/retailer/:retailerId/*`                                                  | Active membership, per-action role and tenant scope                                                        |
| Intelligence       | `/world-prices`, `/imei-check`                                                                                                | Published sourced research; IMEI format check is not certification                                         |
| Administration     | `/admin/dashboard`, `/admin/:resource`, named operations                                                                      | Server permissions, input validation, scope, state transitions and audit                                   |

Use the generated inventory for exact verbs and names; the family table groups related operations. `/health` is process liveness. `/ready` and `/api/health` probe the database and return 503 when unavailable. `/sitemap.xml` and `/robots.txt` live outside the versioned API.

## Catalog contract

`GET /catalog` returns `{ products, total, page, pageSize, facets }`. Filters include `q`, `category`, `model`, `ids`, `storage`, `color`, `stock`, `preorder`, `deals`, `minPrice`, `maxPrice` and sorting. Page size is bounded to 100. Legacy `GET /products` retains its array response for existing callers. Global search returns product results, database-derived suggestions, published content and service destinations.

Homepage discovery uses the same contract with eight products per collection and three finder matches ordered by the lowest matching configuration price. `minPrice`/`maxPrice` are integer minor units (NPR 100,000 is `10000000`). Budget, offers, pre-booking and stock must match the same variant; the response includes only those matching variants. Quick look fetches `/products/:slug` afresh to retrieve all configurations and current public pickup data. Checkout remains authoritative for pricing and inventory.

## Review contract

```json
{
  "rating": 4,
  "title": "A considered purchase",
  "body": "The selected configuration and order updates were easy to follow."
}
```

This is an example request, not seeded or displayed review data. POST accepts exactly these fields and creates `PENDING`; authors cannot supply publication state. Public GET uses six reviews per page and returns accurate `total`, `average`, `page`, `pages`, plus owner-only `ownReview` and `canReview`. Public authors are first names, with no email, user ID or order-item ID.

Admin listing uses 25 rows per page and supports `q`/`status`. `PATCH /admin/reviews/:id` requires `review.moderate`, `{ status: "PUBLISHED" | "REJECTED", reason, expectedUpdatedAt }`, a current revision and a moderator other than the author. Decisions are audited; review text remains intact.

## Operational contracts

Order retries reuse the private receipt key and idempotency key. Store collection cannot compete with an unresolved gateway attempt. Provider reference, amount, currency and transaction identity must agree before payment confirmation. Webhooks remain disabled; `/payments/webhook/:provider` cannot mark an order paid.

CMS updates include `expectedUpdatedAt` for conflict recovery. Blocks support hero, text, FAQ, CTA and keyed homepage sections. Section keys are unique per page; destinations must be internal paths without backslashes, control characters or protocol-relative URLs. Section blocks accept optional boolean `enabled` (default behavior: visible); other block types reject this field. `/home` preserves visibility flags from published content only.

`GET /admin/:resource` explicitly implements supported lists and checks the resource permission. Unsupported operational modules return an unavailable response. The 82 camel-case legacy scaffold URL families are guarded and fail closed; generic writes cannot bypass domain services. A database model alone does not create an API capability.
