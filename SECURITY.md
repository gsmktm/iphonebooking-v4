# Security boundaries

This documents implemented controls and reviewed limitations. It is not a penetration-test certificate. Related integration cases are in [TESTING.md](TESTING.md).

## Identity and browser requests

Passwords use bcrypt. Sessions are random opaque tokens in an HttpOnly, SameSite=Lax cookie; only the SHA-256 hash is stored. Production cookies require Secure. Sessions expire, can be revoked, and are invalidated by password changes or account suspension. The existing session design is retained rather than introducing unnecessary JWT secrets or browser token storage.

Mutations require a custom application header and reject a supplied origin outside the configured allowlist. API browser access stays same-origin; there is no permissive CORS proxy. Helmet applies CSP/security headers. JSON bodies, authentication attempts and general API requests are limited. Proxy trust is an explicit hop count; leave it unset unless the actual reverse-proxy chain is known.

Account recovery uses expiring, single-use, purpose-specific tokens. Only a token record ID is queued; link reconstruction needs the server secret. Recovery links use URL fragments, and password reset revokes sessions. Request acceptance does not claim inbox delivery. Account recovery remains unavailable when mail is not configured.

## Authorization and privacy

Server permissions guard every supported admin operation. Role grants cannot exceed the actor's own permissions. Owner and active tenant membership checks apply inside handlers/services; inaccessible records return 404. Public store projections exclude tenant metadata. Customer repair history excludes technician assignments and staff-only support notes.

Public reviews expose only a first-name display, content, rating, dates and product link. They omit email, customer ID and order-item identity. Pending/rejected text is visible only to its author or permitted staff. Delivered-purchase eligibility, unique constraints and independent moderation prevent arbitrary testimonial creation/publication through public endpoints.

Sessions, private receipt keys and full serials are not logged. Serial uniqueness uses a hash; customer/admin displays use masked last-four values. Logs retain request ID, route, status and timing without request payloads. Database access and backups must be protected as customer data. `/api` responses use `no-store`; the service worker caches only public recovery assets.

## Commerce and integrations

- Authoritative prices/stock/credits are checked again when creating orders. Transaction conditions prevent overselling, duplicate credit use and conflicting reservations. Order snapshots preserve what the customer accepted.
- Private receipt replay requires the original receipt key; an idempotency key alone cannot recover another customer's confirmation. Treat receipt keys as bearer secrets.
- Store collections are permissioned, balance-checked and receipt-unique. A store action cannot bypass an unresolved Khalti attempt.
- Khalti requests use fixed HTTPS endpoints and an allowlisted checkout host. Server lookup verifies reference, amount, currency and transaction identity. Redirect/query parameters cannot mark anything paid. Unknown or mismatched outcomes require reconciliation rather than silently releasing stock.
- Webhooks, eSewa, card charging and provider refund execution are disabled until an implemented authenticated adapter exists. No unverified webhook body is accepted as payment proof.
- CMS blocks render structured text. Links reject unsafe internal-path forms; metadata escapes HTML and JSON-LD `<` characters. The application does not render arbitrary CMS HTML.
- Device/QC/parts/money evidence uses database immutability protections. Corrections require explicit subsequent records, not direct overwrites.

## Remaining launch work

Rate limiting is process-local; multiple API instances require a shared limit store. MFA, distributed abuse detection, recoverable IMEI/EID encryption, customer data retention/deletion procedures, production key rotation, centralized log retention and security monitoring need operational design. Media uploads/object storage are not exposed as a fake working feature; they require separate validated storage and processing boundaries.

No live merchant transaction, public deployment, production load test or comprehensive penetration test has been performed. Existing `.env` files must stay private, outside release archives and browser bundles. Any browser-exposed `VITE_` variable is public; provider/database secrets must never use that prefix.

The dependency audit identified `source-map-js` below 1.2.2 in the Vite/PostCSS/Tailwind build dependency graph. The workspace now pins 1.2.2 through an override to apply the documented denial-of-service fix. See the [GitHub security advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q); the final audit/build results are recorded in [TESTING.md](TESTING.md).
