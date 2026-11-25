# Browser route map

Source: `apps/web/src/app/App.tsx`. Pages load lazily except the initial home composition. Existing canonical routes are preserved. Production Express serves canonical metadata and sends 308 redirects for the documented aliases; client navigation supports those paths as well.

| Area              | Canonical routes                                                                                   | Behavior                                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Discover          | `/`, `/store`, `/search`, `/deals`, `/prebook`, `/wishlist`                                        | Catalog-backed home, search/filter results, real offers/preorder flags and account/guest selections                       |
| Categories        | `/iphone`, `/mac`, `/ipad`, `/watch`, `/airpods`, `/accessories`, `/vision`, `/home`               | Shared category/catalog components                                                                                        |
| Product           | `/products/:slug`, `/compare`                                                                      | Configuration, gallery, reviews and URL-driven comparison                                                                 |
| Purchase          | `/cart`, `/checkout`, `/confirmation`, `/checkout/success`, `/checkout/failure`, `/track`          | Server quote/reservation, private receipt, verification and recovery                                                      |
| Service           | `/trade-in`, `/exchange`, `/sell-device`, `/repair`, `/repair/:ticketId`                           | Estimate/request/decision; signed-in owner repair detail                                                                  |
| Identity          | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`                      | Authentication and capability-aware recovery; corresponding `/account/*` recovery aliases                                 |
| Account           | `/account`, `/account/:section`, `/account/devices/:id`                                            | Overview, orders, devices, repairs, trade-ins, addresses, notifications, security, profile/support and ownership passport |
| Locations/network | `/stores`, `/stores/:slug`, `/retailer-network`, `/retailer`                                       | Public stores/application and scoped retailer workspace                                                                   |
| Intelligence      | `/world-price-map`, `/imei-check`                                                                  | Sourced observations and explicit format-only identity checking                                                           |
| Editorial/help    | `/blog`, `/blog/:slug`, `/support`, `/support/:slug`, `/policies/:slug`, `/campaign/:slug`, `/faq` | Published structured content and support                                                                                  |
| Company           | `/about-us`, `/contact-us`, `/careers`, `/press-room`, `/history`, `/cookies`, `/accessibility`    | Published CMS content or honest unavailable state                                                                         |
| Administration    | `/admin`, `/admin/:resource`                                                                       | Permission-filtered operating interface; unsupported modules stay unavailable                                             |
| Missing page      | unmatched paths                                                                                    | Accessible missing-page view; production document returns 404                                                             |

## Compatibility aliases

| Alias                                                                                        | Destination                                                                              |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `/catalog`                                                                                   | `/store`                                                                                 |
| `/iphone/:slug`                                                                              | `/products/:slug`; production redirect preserves query                                   |
| `/news`, `/news/:slug`                                                                       | `/blog`, `/blog/:slug`; production redirect preserves query                              |
| `/about`                                                                                     | `/about-us`                                                                              |
| `/pre-order`, `/iphone-18`, `/compare-iphones`                                               | `/prebook`, `/iphone`, `/compare`                                                        |
| `/track-order`, `/repair-booking`                                                            | `/track`, `/repair`                                                                      |
| `/privacy`, `/terms`, `/returns`, `/refund-policy`, `/warranty`, `/warranty-info`            | Corresponding canonical policy pages                                                     |
| `/shipping`, `/emi-options`                                                                  | Delivery guide / support; no invented installment offer                                  |
| `/dashboard`, `/preorders`                                                                   | `/account`, `/account/orders`                                                            |
| `/profile`, `/orders`, `/repairs`, `/trade-ins`, `/addresses`, `/notifications`, `/security` | Corresponding account section                                                            |
| `/account/preorders`, `/account/wishlist`                                                    | `/account/orders`, `/wishlist`                                                           |
| `/admin/dashboard`, `/admin/preorders`                                                       | `/admin`, `/admin/bookings`                                                              |
| `/admin/cms`, `/admin/news`, `/admin/imei`, `/admin/audit`, `/admin/shipments`               | `/admin/content`, `/admin/content`, `/admin/units`, `/admin/audit-logs`, `/admin/orders` |

Order-detail views currently live in account sections; the brief's arbitrary nested order/preorder URLs are not advertised as implemented. Requested distributor/promotion/country/SEO/settings enterprise modules do not become working features merely through a matching admin route.

Private account/admin/retailer/checkout/cart/track/wishlist/search/repair-detail documents use noindex. Product/news aliases have canonical production redirects to avoid duplicate indexed pages. Query-filtered and development-seed pages are noindex. Metadata injection is implemented; full content SSR is not.
