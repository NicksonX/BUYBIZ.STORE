# BUYBIZ

BUYBIZ is a Nigerian digital marketplace for short-lived shared proxy access. Customers fund an internal wallet with Paystack, buy a 24-hour, 7-day or 30-day proxy package, and see their connection details and exact expiry in a customer dashboard. Admins manage inventory, allocations, deposits, refunds, expenses, support and reporting in a separate dark console.

The service is deliberately plain about two things: proxy credentials are shared by up to 10 active customers, and wallet credit is not a bank balance or a cash-withdrawal account.

## Live local access

The app is running locally from this checkout:

| Surface | URL |
| --- | --- |
| Customer site | http://localhost:3000 |
| Admin console | http://localhost:3000/admin |
| Network access | http://192.168.0.4:3000/admin |
| Health check | http://localhost:3000/api/health |

Demo accounts:

| Role | Email | Password |
| --- | --- | --- |
| Customer | `demo@buybiz.test` | `Demo1234!` |
| Admin | `admin@buybiz.test` | `Admin1234!` |
| Support | `support@buybiz.test` | `Support1234!` |

The local demo uses an in-memory PGlite database. It resets when the server restarts. The current server is a persistent systemd user service:

```bash
systemctl --user status buybiz-dev.service
systemctl --user restart buybiz-dev.service
journalctl --user -u buybiz-dev.service -f
```

## Backend

There is no separate Express server. The backend is inside Next.js 16:

- **Server Actions** in `src/server/actions` handle authenticated mutations such as deposits, purchases, support replies and admin changes.
- **Route Handlers** in `src/app/api` handle the Paystack webhook, lifecycle cron and health check.
- **PostgreSQL** is the source of truth in production, accessed through `pg` with server-side transactions (`src/lib/db` and `src/server/services`).
- **Supabase** provides Postgres, Auth and email/OAuth sign-in. RLS migrations live in `supabase/migrations`.
- **PGlite** is the embedded Postgres used only for the local demo.
- **Paystack** handles hosted checkout and server-side payment verification.
- **Server-only code** is marked with `server-only`. Service-role secrets never reach the browser.

Money is stored as integer kobo. Wallet balances are derived from an append-only ledger. Purchases lock the wallet and inventory rows, re-count live seats, debit once, allocate once, and automatically refund the wallet if stock is unavailable. A database trigger blocks an 11th active seat even if the application layer is bypassed.

## Main flows

- Email/password registration, login, logout, password reset and email verification in demo mode.
- Supabase Auth email/password plus Google and Apple wiring for production.
- Paystack deposit initialization, callback verification, webhook verification and idempotent crediting.
- Atomic proxy purchase with 24-hour, 7-day and 30-day packages.
- Proxy credentials encrypted with AES-256-GCM and revealed only to the owner while active.
- Expiry lifecycle, upstream interruption, no-stock refunds and independent seat release.
- Customer dashboard, wallet, orders, proxies, support, settings and notifications.
- Admin users, inventory, allocations, products, orders, deposits, ledger, adjustments, expenses, support, analytics, audit, settings and search.
- No fake metrics. Admin charts and totals come from orders, deposits, expenses and the wallet ledger.

## Local setup

Requirements: Node 24 and npm. The project includes `.node-version` and `.nvmrc`.

```bash
nvm use 24.22.2
npm ci
cp .env.example .env.local
```

For the demo, set these values in `.env.local`:

```dotenv
DEMO_MODE=true
DEMO_DB_DIR=memory://
DEMO_SESSION_SECRET=replace-with-at-least-32-random-characters
PROXY_CREDENTIAL_ENCRYPTION_KEY=replace-with-32-byte-base64
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Generate keys with:

```bash
openssl rand -base64 32
```

Then run:

```bash
npm run dev
```

Never set `DEMO_MODE=true` on a public deployment. Demo payments are simulated and clearly labelled; they are not proof of a real Paystack payment.

## Tests

```bash
npm test          # unit, integration and RLS tests
npm run test:e2e  # Playwright against a running server
npm run typecheck
npm run lint
npm run build
```

The test suite covers:

- money parsing and formatting;
- Paystack webhook HMAC verification and raw-body idempotency references;
- demo password hashing and AES-256-GCM credential encryption;
- atomic purchase, insufficient balance, no-stock refund, insufficient upstream lifetime, 12-way concurrency with a 10-seat cap, and independent expiry;
- deposit idempotency and amount mismatch handling;
- RLS policies for customer isolation, blocked self-promotion, locked inventory and anonymous access;
- internal transfers disabled by default and the double-entry path when explicitly enabled in an isolated test.

RLS is verified locally with PGlite by applying the real Supabase auth and RLS migrations to a stubbed `auth` schema. Production still needs the migrations applied to the actual Supabase project.

## Production database and auth

1. Create a Supabase project.
2. Copy the Postgres connection string into `DATABASE_URL`. Use SSL.
3. Copy the project URL and publishable key into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Apply the migrations in `supabase/migrations` in filename order:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Alternatively, run each SQL file with `psql` against the database. Do not run the Supabase auth and RLS migrations against a database that has no Supabase `auth` schema.

5. In Supabase Auth URL configuration, add:

```text
https://YOUR_DOMAIN/auth/callback
https://YOUR_DOMAIN/auth/confirm
```

6. For the email confirmation template, use a link shaped like:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard
```

7. Sign up the owner account, then promote it once:

```sql
update public.profiles
set role = 'super_admin'
where email = 'owner@example.com';
```

8. To enable Google or Apple, configure the provider in Supabase Auth, then set `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true` or `NEXT_PUBLIC_AUTH_APPLE_ENABLED=true` and redeploy. The buttons stay disabled until both Supabase and the provider are configured.

## Paystack

1. Create a Paystack account and use test keys first.
2. Set `PAYSTACK_SECRET_KEY` and `PAYSTACK_MODE=test`.
3. Add the webhook URL in Paystack:

```text
https://YOUR_DOMAIN/api/paystack/webhook
```

4. Subscribe to `charge.success`. The webhook verifies the raw request body with HMAC-SHA512, checks the reference, amount and currency, and writes exactly one wallet credit. Replayed events are ignored.
5. Test a deposit end to end before switching `PAYSTACK_MODE=live` and replacing the key with a live secret.

No Paystack public key is required because the integration uses hosted checkout redirects.

## Deploy to Render

`render.yaml` defines:

- a Node web service with `GET /api/health` as the health check;
- a scheduled lifecycle job every 15 minutes.

Create a Render Blueprint from the repository. Set every `sync: false` value in the Render dashboard:

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Final `https://` URL. Changing it requires a rebuild. |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Random secret. Use one value across all instances. |
| `DATABASE_URL` | Supabase Postgres connection string. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key. |
| `PROXY_CREDENTIAL_ENCRYPTION_KEY` | 32-byte base64 or 64 hex characters. |
| `PAYSTACK_SECRET_KEY` | Test key first. |
| `CRON_SECRET` | Random secret for the HTTP lifecycle endpoint. |
| `OFFICIAL_SUPPORT_EMAIL` | Only if the business supplies one. |
| `RATE_LIMIT_SALT` | Random value for hashed rate-limit keys. |

Generate the encryption key with `openssl rand -base64 32`. Do not use Render's generic generated value unless you confirm it decodes to exactly 32 bytes.

The cron service runs `scripts/lifecycle.ts` directly against Postgres. It does not need the web service to be reachable. If you prefer an HTTP cron, call:

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  "https://YOUR_DOMAIN/api/cron/lifecycle"
```

## Lifecycle

The lifecycle job:

- marks expired allocations;
- marks upstream interruptions;
- reconciles inventory status;
- releases seat counts;
- checks stale Paystack deposits.

It is safe to run repeatedly. Expiry is independent per allocation and does not shorten another customer's access. Shared upstream credentials cannot be individually revoked at network level; the database entitlement and credential visibility end, and this limitation is disclosed.

## Internal transfers: disabled

The transfer design is implemented but intentionally not enabled or linked to any UI:

- `supabase/migrations/20261110000500_internal_transfers.sql` adds the ledger enum values.
- `supabase/migrations/20261110000510_internal_transfers_tables.sql` adds the transfer table and limits.
- `supabase/migrations/20261110000600_internal_transfers_rls.sql` lets a user read only transfers where they are a party and grants no insert rights.
- `src/server/services/transfers.ts` implements verified-recipient checks, wallet locks, limits, double-entry ledger entries, notifications and audit.

It refuses to run unless `ENABLE_WALLET_TRANSFERS=true` **and** the database setting `wallet_transfers_enabled` is true. No action or page calls it. Before enabling, the owner must confirm that wallet balances are fully backed by real deposits and obtain legal and AML review. Transferable stored-value credit can create money-transmission and cash-out risk, so it must remain internal credit and must never become a hidden withdrawal route.

## Security notes

- Server secrets stay server-side.
- Proxy credentials use AES-256-GCM and are never returned in admin list queries.
- Wallet, order and support reads are scoped by user id.
- Admin actions are role-guarded and audited with actor, IP and user agent.
- Paystack webhooks use the raw body HMAC, not a parsed JSON re-serialization.
- Database triggers enforce ledger immutability, one active allocation per order, seat caps, expiry after activation and allocation expiry within upstream lifetime.
- The CSP limits scripts, frames and connections to the app, Supabase and Paystack.
- Rate limiting is database-backed for login, registration, password reset, contact and purchases.

## Known limitations and open decisions

- Paystack live mode has not been exercised because no live credentials are configured.
- Outbound transactional email is not configured. In-app notifications and support replies work; no email delivery guarantee.
- MFA and admin device management are not implemented.
- The support email and legal entity details are intentionally blank until supplied.
- Terms and Privacy are drafts and require legal review.
- The shared-proxy and no-withdrawal policies need a final legal review, but they are disclosed in the checkout, wallet and footer.
- There is no WebSocket live feed. Admin pages query current database state on every request and revalidate after actions; refresh to see changes made elsewhere.
- Demo data is for evaluation only and must not be used in production.

## Project structure

```text
src/app                 routes and route handlers
src/components          brand, UI, marketing, customer and admin components
src/lib                 config, database driver, money, security, Paystack, validation
src/server/actions      authenticated Server Actions
src/server/data         typed read queries
src/server/services     transactional business logic
supabase/migrations     Postgres schema, auth integration, RLS, transfers, jobs
tests                   unit, integration, RLS and Playwright tests
scripts                 lifecycle runner
```
