# BUYBIZ

BUYBIZ is a Nigerian digital marketplace for short-lived shared proxy access. Customers fund an internal wallet with Paystack, buy a 24-hour, 7-day or 30-day proxy package, and see their connection details and exact expiry in a customer dashboard. Admins manage inventory, allocations, deposits, refunds, expenses, support and reporting in a separate dark console.

The service is deliberately plain about two things: shared proxy plans use the same upstream credentials as other active customers, and wallet credit is not a bank balance or a cash-withdrawal account. The Personal 30-Day Proxy is limited to one active customer per proxy.

## Live local access

The app is running locally from this checkout.

Project folder on your PC:

```text
/home/nickson_x/Documents/deepseek-harness/default-workspace/buybiz
```

Desktop shortcut: `~/Desktop/BUYBIZ`

VS Code workspace: `~/Desktop/BUYBIZ/BUYBIZ.code-workspace`

Open it from a terminal with:

```bash
code /home/nickson_x/Documents/deepseek-harness/default-workspace/buybiz/BUYBIZ.code-workspace
```

VS Code and this agent do not have a direct remote-control link. VS Code opens the same local folder, so saved changes appear immediately in the editor and Git diff. There is no cloud copy and no hidden live session.

| Surface | URL |
| --- | --- |
| Customer site | http://localhost:3000 |
| Admin console | http://localhost:3000/admin |
| Network access | http://172.20.10.5:3000/admin (current Wi-Fi IP; run `hostname -I` if it changes) |
| Health check | http://localhost:3000/api/health |

Demo accounts:

| Role | Email | Password |
| --- | --- | --- |
| Customer | `demo@buybiz.test` | `Demo1234!` |
| Admin | `admin@buybiz.test` | `Admin1234!` |
| Support | `support@buybiz.test` | `Support1234!` |

The local demo uses an in-memory PGlite database. It resets when the server restarts. The always-on app is served from the production build by systemd:

```bash
systemctl --user status buybiz.service
systemctl --user restart buybiz.service
journalctl --user -u buybiz.service -f
```

The last verified production build is already running. To edit with hot reload, stop the stable service first, then start the dev server:

```bash
systemctl --user stop buybiz.service
npm run dev
```

When the changes are ready, rebuild and switch back:

```bash
npm run build
systemctl --user start buybiz.service
```

The production server uses substantially less memory than the hot-reload server.

### Laptop resource note

The largest memory consumer on this laptop is usually Chrome with many tabs, not the app. The development server can also grow after many hot reloads. The test suite is capped to one worker, and browser checks use one page and viewport screenshots instead of 10,000px full-page captures. If the machine feels heavy:

```bash
systemctl --user restart buybiz.service
```

Close unused Chrome tabs if memory is tight. Do not run `npm test`, `npm run build` and a full browser suite at the same time.

## Backend

There is no separate Express server. The backend is inside Next.js 16:

- **Server Actions** in `src/server/actions` handle authenticated mutations such as deposits, purchases, support replies and admin changes.
- **Route Handlers** in `src/app/api` handle the Paystack webhook, lifecycle cron and health check.
- **PostgreSQL** is the source of truth in production, accessed through `pg` with server-side transactions (`src/lib/db` and `src/server/services`).
- **Supabase** provides Postgres, Auth and email/OAuth sign-in. RLS migrations live in `supabase/migrations`.
- **PGlite** is the embedded Postgres used only for the local demo.
- **Paystack** handles hosted checkout and server-side payment verification.
- **Server-only code** is marked with `server-only`. Service-role secrets never reach the browser.

Money is stored as integer kobo. Wallet balances are derived from an append-only ledger. Purchases lock the wallet and inventory rows, re-count live seats, debit once, allocate once, and automatically refund the wallet if stock is unavailable. Database triggers also block over-allocation if the application layer is bypassed.

## Main flows

- Email/password registration, login, logout, password reset and email verification in demo mode.
- Supabase Auth email/password plus Google OAuth for production.
- Paystack deposit initialization, callback verification, webhook verification and idempotent crediting.
- Atomic proxy purchase with 24-hour, 7-day, 30-day and Personal 30-day packages. The Personal plan is limited to one active customer per proxy and one active Personal plan per customer.
- Manual proxy renewal while an allocation is active. It extends from the current expiry, debits the wallet and checks upstream lifetime before charging.
- Proxy credentials encrypted with AES-256-GCM and revealed only to the owner while active.
- Expiry lifecycle, upstream interruption, no-stock refunds and independent seat release.
- Customer dashboard, wallet, orders, proxies, referrals, support, settings and notifications.
- Referral programme: ₦1,000 wallet credit after one verified external deposit of at least ₦3,000. Internal transfers, refunds and admin credits never qualify.
- A guarded AI support assistant with public-only knowledge. It cannot change accounts, reveal private business data or suspend users; suspicious extraction attempts are logged for human review.
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

## Onboarding and tutorial

New email and OAuth accounts are created with `onboarding_complete = false`. The onboarding page asks for a single intended use case, stores it in `profiles.proxy_use_case`, records `onboarding_completed_at`, and then opens the dashboard. Existing accounts keep their completed state and are not forced through onboarding again.

The voiceover tutorial is available from onboarding and from the **How to use the platform** strip on the customer dashboard. The video and poster live under `public/tutorial/`.

## Proxy termination and switching

Active proxy details include **Switch proxy** and **Terminate proxy** actions.

- Switching moves the allocation to another proxy of the same access type after a server-side capacity and upstream-lifetime check. It does not change `activated_at` or `expires_at`, create a purchase, charge a wallet, or trigger a refund.
- Termination locks the allocation, records the completed 24-hour periods, calculates the refund from the original order amount and configured product duration, updates the allocation to `terminated`, releases the capacity slot, and credits the wallet once in the same transaction.
- `proxy_terminations` and `proxy_switches` provide immutable history.
- Shared inventory is capped at 10 active seats by application validation, the allocation trigger, and a database constraint. The customer switch UI shows availability without disclosing the exact number of other customers on a shared proxy.

## Marketplace wallet balance

The marketplace deliberately does not show the customer's wallet balance. The balance remains on the Dashboard and Wallet pages, and the global sidebar hides its wallet card only while the marketplace is open. Checkout remains a separate confirmation step.

## Authentication

Email/password and Google OAuth are supported. Apple authentication has been removed from the application and environment configuration. Google requires the Supabase Google provider and redirect URLs to be configured.

## Mobile

The customer experience is designed around 360px-wide Android screens, the largest Nigerian mobile resolution group in Statcounter data. It adds safe-area padding, 44px touch targets, 16px form fields to stop iOS zoom, a 100dvh menu and a lighter mobile render path. The research and test matrix are in [docs/mobile-ui.md](docs/mobile-ui.md).

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
- atomic purchase, insufficient balance, no-stock refund, insufficient upstream lifetime, 12-way concurrency with the configured seat cap, and independent expiry;
- personal-proxy one-customer and one-active-per-customer rules;
- manual renewal success, insufficient upstream lifetime and expired-allocation rejection;
- referral qualification, one-time reward, self-referral rejection and transfer-credit exclusion;
- deposit idempotency and amount mismatch handling;
- RLS policies for customer isolation, blocked self-promotion, locked inventory and anonymous access;
- internal transfers disabled by default and the double-entry path when explicitly enabled in an isolated test.

The suite currently contains 45 automated tests. RLS is verified locally with PGlite by applying the real Supabase auth and RLS migrations to a stubbed `auth` schema. Production still needs the migrations applied to the actual Supabase project.

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

8. To enable Google, configure the provider in Supabase Auth, then set `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true` and redeploy. The button stays disabled until both Supabase and Google are configured.

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

## Referral programme

Every customer gets a code on `Dashboard > Refer and earn`. The reward is ₦1,000 in internal BUYBIZ wallet credit after a referred customer makes one verified external deposit of at least ₦3,000. The trigger is inside external deposit crediting only, so internal user transfers, refunds, admin credits and adjustments cannot qualify. One reward is allowed per referred account. Self-referrals and duplicate-account abuse are rejected.

## Wallet funding and payment states

Wallet funding is opened from an **Add money** button. The amount, presets, checkout options and submit button stay inside a dialog and are not mounted until the customer opens it. Closing the dialog unmounts the form and returns the wallet to its normal view.

Each deposit attempt carries a browser-generated reference. The server reuses the existing deposit if the same reference is submitted twice, and concurrent duplicate inserts are rejected by the unique provider reference. The checkout button is disabled while a request is pending.

Payment results have dedicated routes:

- `/dashboard/wallet/payment/success`
- `/dashboard/wallet/payment/failed`
- `/dashboard/wallet/payment/pending`

Each route calls the backend verifier. A redirect or query string alone never marks a deposit successful. Pending payments are never treated as credited.

## Error and offline states

- A branded 404 page covers unknown routes.
- A root error boundary and a global error boundary provide retry actions.
- An offline banner appears when the browser loses connectivity and clears when it returns.
- Empty wallet history is shown as an empty state, separate from a network or server error.

## Paystack test and live separation

Replacing Paystack keys does not reset balances or remove test history. Do not point live keys at the current test database. The safe launch path is a fresh live Supabase project, with the test project retained for auditing. The full explanation and launch procedure are in [docs/paystack-test-live.md](docs/paystack-test-live.md).

## AI support assistant

Set an OpenAI-compatible provider in the server environment:

```dotenv
AI_SUPPORT_API_KEY=...
AI_SUPPORT_BASE_URL=https://api.openai.com/v1
AI_SUPPORT_MODEL=gpt-4o-mini
```

The assistant is a curated public-knowledge assistant, not a fine-tuned model and not an admin tool. It has no database access, cannot see other customers, and cannot perform refunds, wallet changes, credential reveals or suspensions. Suspicious private-information requests are written to the audit log as `ai.support_security_flag` for human review. The assistant never suspends an account.

Without an API key, the support page says the assistant is not connected and directs the customer to a human ticket. It does not fake AI replies.

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
| `AI_SUPPORT_API_KEY` | Optional. Leave blank to show the honest not-connected state. |
| `AI_SUPPORT_BASE_URL` | OpenAI-compatible API base, for example `https://api.openai.com/v1`. |
| `AI_SUPPORT_MODEL` | Model id for the support assistant. |

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

## Go-live checklist

1. Create the production Supabase project and apply every migration.
2. Set the production environment variables in Render. Never enable `DEMO_MODE`.
3. Configure Supabase Auth email and Google redirect URLs.
4. Create the owner account and promote it with the SQL in the database section.
5. Create the Paystack account, set the webhook, and test deposits in test mode.
6. Run one complete purchase, no-stock refund and support flow against the deployed URL.
7. Confirm the health check, lifecycle cron and audit log are working.
8. Have the Terms, Privacy, shared-proxy and no-withdrawal policies reviewed by a lawyer.
9. Switch Paystack to live only after the business account is approved and a small live payment is reconciled.
10. Keep customer support and refund handling staffed before public launch.

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


## Marketing photo credit

The desktop home hero uses a Pexels photo by ANTONI SHKRABA production. Pexels allows free commercial use without required attribution; the credit is recorded here for provenance.


## Wallet credits, inactivity and rotation

The wallet minimum is 3,000 credits (₦3,000), at 1 credit = ₦1. Credits never expire. Package prices remain ₦500, ₦1,000 and ₦3,000 for the 24-hour, 7-day and 30-day plans.

Customer accounts freeze after the configurable inactivity period, defaulting to 60 days. Frozen balances and history are preserved. A customer can reactivate by paying the configured ₦1,000 wallet fee when their preserved credit is sufficient, or an administrator can unfreeze the account manually. Expired proxy subscriptions are not restored by reactivation.

Daily and weekly proxy inventory is package-specific and uses manual upstream rotation. See [proxy limitations](docs/proxy-limitations.md) for what BUYBIZ can and cannot enforce upstream. In-app admin reminders are in the notification centre; external email, SMS and voice delivery are intentionally disabled until a provider is configured.


## Referral, Ambassador and email operations

Referral rewards remain internal NGN wallet credits. Ambassador commissions are tracked separately in USD cents and paid manually as USDT BEP20 after an administrator verifies the address and approves the payout.

Email delivery uses an HTTPS API adapter and a durable outbox. Provider credentials are server-only Render environment variables. Admin email management shows whether the provider is configured and never reports a skipped message as sent. For free Render hosting, schedule `GET /api/cron/emails` with `Authorization: Bearer CRON_SECRET` from a free HTTPS scheduler; no SMTP and no paid Render cron are required.

Signup OTPs are application-level 6-digit codes hashed in the database. If the email provider is not configured, the existing Supabase verification path remains available and the admin dashboard shows the missing provider status. For a fully branded OTP-only signup, configure the provider and disable Supabase's duplicate confirmation email in the Supabase Auth email settings.


## Ambassador programme and email

Qualified referral rewards remain 1,000 BUYBIZ wallet credits. Ambassadors are promoted automatically after the configured number of qualified referrals and earn USD commissions in a separate ledger from the naira wallet. USDT BEP20 payouts are reviewed and sent manually by an administrator; no payout is marked paid automatically.

Email is delivered through a durable HTTPS queue. Configure the provider environment in Render as described in [email setup](docs/email-setup.md). For free Render hosting, schedule `/api/cron/emails` with a free HTTPS scheduler. Admin email management exposes provider setup status, templates, opt-in marketing campaigns, delivery logs and safe retries without exposing OTPs or API keys.
