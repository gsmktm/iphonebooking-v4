# Supabase Auth — optional iPhoneBooking V4 preview

This is an **opt-in** email/password identity provider for the isolated Supabase-backed preview only. Existing iPhoneBooking accounts, original Railway PostgreSQL and checkout continue to use the existing authentication system.

## Design

1. Email/password registration and sign-in go through Supabase GoTrue, called from Express using a publishable key. The server checks the returned bearer token by requesting the verified identity from GoTrue rather than trusting unverified JWT text from the browser.
2. No account is created in iPhoneBooking until Supabase returns a confirmed email after a successful sign-in.
3. The bridge creates a one-hour, secure HTTP-only application cookie. No Supabase access or refresh token is kept in browser storage or persisted.
4. A separate SupabaseIdentity table maps a Supabase UID to a single local customer account. The local passwordHash is not a valid login hash and the default role is null. The app never silently merges an existing customer or privileged account by matching email.
5. Existing local authorization and role permissions remain the sole source of truth. The Supabase user_metadata display name never grants a permission.
6. Both signup and sign-in are subject to existing rate limits, CSRF/origin controls, request validation and standard error logging.

## Configure on Railway

On the service named iphonebooking-supabase-preview only, configure these environment variables:

- SUPABASE_AUTH_ENABLED=true
- SUPABASE_URL = the verified Supabase project URL
- SUPABASE_PUBLISHABLE_KEY = the project's publishable key, not any service_role or secret key

Do NOT copy them to the main website deployment. Do NOT publish a privileged secret in Vite or browser config.

In the Supabase Dashboard confirm Authentication > Providers > Email is enabled, email confirmation is required, and Authentication > URL Configuration has the intended preview Site URL and permitted redirect URLs. Configure custom SMTP and appropriate rate limits before inviting real customers.

## Routes

- GET /api/v1/auth/capabilities adds a supabaseAuth availability flag while preserving existing fields.
- POST /api/v1/auth/supabase/register accepts email, name, password; returns a generic 202 confirmation message and no logged-in cookie.
- POST /api/v1/auth/supabase/login accepts email, password; on verified login it issues a local 1-hour session.
- /login offers an opt-in Supabase Auth switch when enabled, while original login/signup remains usable.

## Limits that block full rollout

Supabase password recovery, cross-device signout revocation, MFA/social providers, account merging, and production-grade mail delivery still require follow-up implementation. Disabling a Supabase user will not instantly expire the already issued local cookie, which may last up to one hour. Full customer rollout requires a real test-inbox signup, confirmation, sign-in, and recovery review.

The shared database password must be rotated, followed by updating the service DATABASE_URL. The existing commerce schema stays unexposed to Supabase Data API; enabling Auth does not grant public table access.

References:

- https://supabase.com/docs/guides/auth
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/database/postgres/row-level-security
