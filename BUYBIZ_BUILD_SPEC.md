# BUYBIZ  -  Complete Product, Design & Engineering Build Specification

> **Purpose:** This is the primary implementation brief for the BUYBIZ coding agent. Read it completely before changing code. Treat the supplied `reference/buybiz-ui-reference.png` as the visual source of truth for the interface direction. Build a real, secure, working application - not a static mockup.
>
> **Brand:** BUYBIZ  
> **Initial market:** Nigeria  
> **Currency:** Nigerian naira (NGN / ₦)  
> **Initial live product:** Proxy access only  
> **Coming soon:** Virtual phone numbers and PayPal-related services  
> **Backend platform:** Supabase  
> **Application hosting:** Render  
> **Payments:** Paystack for wallet deposits (integration must be configurable and tested in test mode first)

---

## 0. Instructions to the coding agent

1. Inspect the entire repository and the supplied reference image before coding. If this is a new repository, scaffold the project cleanly.
2. Research current official documentation before implementing integrations. Prefer official documentation linked in Section 16. Do not rely on outdated model knowledge or invent SDK methods.
3. Build in phases, but do not stop after creating a pretty landing page. Implement the database, authentication, wallet, proxy inventory, allocation, admin workflows, security, tests, and deployment configuration.
4. The reference image is a high-level visual guide. Recreate its layout, hierarchy, spacing, contrast, typography, glossy black/white finish, navigation, dashboard composition, product cards, and responsive adaptations as closely as practical. Do not copy inaccurate text, random metrics, or unrelated products from the image.
5. Do not produce generic “AI-generated SaaS” styling. Avoid gratuitous gradients, excessive rounded cards, oversized empty hero sections, random floating blobs, excessive icons, glassmorphism everywhere, and decorative borders. The result must look like a carefully art-directed digital marketplace.
6. Do not invent business rules where this brief identifies an unresolved decision. Mark it as a configuration or ask the project owner before finalizing.
7. Use real database-backed data. Never use hard-coded fake balances, fake orders, fake revenue, fake charts, fake customer counts, or fake success messages in production views. Seed data may be used only in development and must be visibly identified as demo data.
8. Deliver readable, maintainable TypeScript. Avoid giant components and duplicated business logic.
9. Keep a running `README.md` with local setup, environment variables, migrations, tests, and Render deployment instructions. This build specification remains the product source of truth.
10. Do not ask the owner for secrets in chat or commit secrets to Git. Use `.env.example` with placeholder names only.

## 1. Product overview

BUYBIZ is a Nigeria-focused digital services marketplace. Customers create an account, fund an internal BUYBIZ wallet, and use wallet credit to purchase proxy access. The wallet is an internal purchasing balance; **customers cannot withdraw wallet credit** in the initial release.

The platform has three major areas:

- **Public website:** Home, marketplace, about, how it works, FAQ, contact/support, terms, privacy, login and registration.
- **Customer dashboard:** Overview, proxy marketplace, active proxies, orders, wallet/deposits, transactions, support, settings and profile.
- **Admin dashboard:** Overview/analytics, users, proxy inventory, allocations, products/pricing, orders, deposits, wallet ledger, refunds/credits, expenses, support tickets, audit log and settings.

Only proxy services are operational at launch. Virtual phone numbers and PayPal services can be visible as “Coming Soon” sections/cards, but must not accept payment, create fake orders, or imply availability.

### 1.1 Launch products and prices

All prices are in NGN and must be editable by authorized admins from the database-backed admin product settings.

| Product | Duration | Launch price |
|---|---:|---:|
| Proxy  -  24 Hours | 24 hours | ₦500 |
| Proxy  -  7 Days | 7 days | ₦1,000 |
| Proxy  -  30 Days | 30 days | ₦3,000 |

Display these exact launch prices unless an admin changes them. Do not silently add taxes or fees. If payment gateway fees apply to deposits, disclose them before checkout and record the actual amounts separately.

### 1.2 Important terminology

- **Proxy inventory item:** One upstream proxy manually added by an admin.
- **Seat/capacity:** One customer allocation on that upstream proxy.
- **Maximum seats:** 10 active customers per inventory item by default. Store this as a configurable value, initially 10.
- **Allocation:** A record connecting a customer order to one inventory item.
- **Customer entitlement:** The customer's period of authorized use, independent of other customers assigned to the same upstream proxy.
- **Wallet balance:** Internal available credit derived from an immutable ledger, not an editable number in the browser.

## 2. Critical proxy business rules

Implement these rules centrally in server-side business logic and database transactions. Never rely on frontend checks alone.

### 2.1 Manual proxy inventory entry

The admin buys proxies independently and manually enters them into BUYBIZ. Do not integrate with an upstream proxy supplier at launch.

Admin proxy form should support:

- Proxy label/internal name
- Protocol: HTTP, HTTPS, SOCKS4 or SOCKS5 (only show protocols the app actually supports)
- Host/IP
- Port
- Upstream username (optional if provider does not require it)
- Upstream password (optional if provider does not require it)
- Region/country/location (optional)
- Provider/reference note (private admin field)
- Purchase cost (NGN; optional but recommended for profit reporting)
- Maximum seats (default 10; admin may change only with permission)
- Upload/activation timestamp (set automatically by server at creation; admin cannot backdate without a privileged audited action)
- Upstream expiry timestamp (required if known; see Section 2.4)
- Status: available, full, paused, expired, disabled
- Admin notes

Validate host, port, protocol and required credentials. Do not store secrets in plaintext if avoidable. Encrypt proxy credentials at rest using a server-side encryption key held only in Render environment variables. Never return decrypted upstream credentials in broad admin list responses. Provide a deliberate reveal action with permission checks and audit logging.

### 2.2 Ten customers per upstream proxy

- Each inventory item has a maximum of 10 concurrent active customer allocations by default.
- A proxy with 0-9 active seats may be considered for a new allocation if it has enough remaining usable lifetime.
- At 10 active seats, it is full and cannot receive another active customer.
- The next eligible customer must be assigned to the next available inventory item.
- Use a deterministic allocation strategy, such as oldest eligible inventory first (FIFO), unless the admin selects another documented strategy.
- Seat counting must be based on allocation records whose status is active and whose expiry is in the future - not a counter that can drift.
- Enforce the seat limit atomically in Postgres using a transaction/row lock or a carefully designed database function. Two customers buying at the same time must never create an 11th active allocation.
- Store the inventory item ID on each allocation so it is always possible to trace which upstream proxy a customer received.

**Credential honesty:** Ten customers sharing one upstream proxy may share the same outgoing IP. Do not claim that each customer has a dedicated IP. Do not fabricate different usernames, passwords or ports. If a proxy gateway is later added that genuinely supports separate customer credentials/ports, implement those as real gateway-issued credentials. Otherwise show the actual connection details supplied for that proxy and label the service as shared.

### 2.3 No inventory available  -  automatic wallet refund

If a customer has enough wallet credit but no eligible proxy inventory exists:

1. Do not create a successful active proxy entitlement.
2. Create a failed/unfulfilled order with a clear reason such as `OUT_OF_STOCK`.
3. Credit the full purchase amount back to the customer's BUYBIZ wallet through a new immutable ledger entry.
4. Link the refund ledger entry to the original order.
5. Make the refund idempotent: retrying the request or webhook must not credit the customer twice.
6. Show a clear status in the customer's order history: “Refunded to BUYBIZ balance  -  no proxy available.”
7. Notify the customer in-app and, if email notifications are configured, by email.
8. Record the event in the admin audit log.

The refund is to the internal BUYBIZ wallet balance, not a cash withdrawal to the customer's bank. The customer cannot withdraw internal wallet credit in the launch version.

### 2.4 Expiry: distinguish stock expiry from customer package duration

There are two different clocks. Implement them separately and clearly.

**Inventory clock**
- `uploaded_at` is set by the server when the admin creates the inventory item.
- The owner's stated initial rule is that the proxy's 30-day stock validity countdown starts when it is uploaded.
- Support an explicit `upstream_expires_at` field. If the upstream provider confirms expiry, record the exact timestamp. If not known, allow an admin-configured stock expiry rule of 30 days after upload, but label it as an assumed/manual expiry - not a provider-verified expiry.
- When the inventory item expires, it must not be allocated to new customers. Existing allocations must be marked as interrupted/expired according to the configured policy, and the customer must be informed. Do not silently show an active service whose upstream proxy has expired.

**Customer clock**
- 24-hour package: expires exactly 24 hours after successful allocation.
- 7-day package: expires exactly 7 × 24 hours after successful allocation.
- 30-day package: expires exactly 30 × 24 hours after successful allocation.
- One customer's expiry must not disable or change the other nine customers' allocation records.
- Use UTC timestamps in the database; display localized dates/times in the UI.
- Expired allocations stop being counted as active seats and cannot be used to regain access.

**Important product-owner decision that must not be hidden:** If the upstream proxy expires exactly 30 days after upload, a customer who buys the 30-day package several days after upload cannot receive a full 30 days of upstream service. The system must not promise more time than the upstream proxy can provide. Implement an eligibility guard: only sell a package if `upstream_expires_at >= now() + package_duration + safety_buffer`. If there is not enough remaining inventory life, skip that inventory item. If no other eligible item exists, refund the customer wallet as described above. This means a proxy with only 30 days of stock life may only support a full 30-day customer package at the very beginning of its stock period. The owner must decide whether to (A) buy longer-lived upstream proxies, (B) reduce the customer package length to fit remaining stock life, or (C) define a different inventory-expiry policy. Do not silently change the stated prices or durations.

### 2.5 Shared proxy access and individual expiry limitation

The platform can expire a customer's BUYBIZ entitlement independently in its database. However, if all ten customers use the exact same upstream username/password and the upstream provider has no per-user credential/session control, BUYBIZ cannot technically revoke only one customer's network access while leaving the other nine connected. In that case:
- Mark that customer's entitlement expired.
- Remove the connection details from the customer's active-services view.
- Do not disable or rotate the shared upstream credentials, because that would disrupt other customers.
- Clearly understand that database expiry is not equivalent to technical network revocation when credentials are shared.
- Do not claim individual access has been technically blocked unless the architecture genuinely provides per-customer gateway credentials or a revocation-capable proxy gateway.

Build the system so a future customer-specific proxy gateway can be integrated, but do not invent that functionality in version one.

### 2.6 Allocation workflow (must be transactional)

When a signed-in customer clicks Buy:

1. Server authenticates the user and checks account status.
2. Server loads the current active product price from the database; never trust a price sent by the browser.
3. Server checks wallet available balance from the ledger.
4. Server finds an eligible inventory item with a free seat and enough remaining upstream life for the selected duration.
5. In one database transaction, lock the wallet/account and inventory row(s), re-check balance and capacity, debit wallet, create order, create allocation, and write ledger entries.
6. If no inventory exists, create the order attempt and an idempotent wallet refund/credit flow. Do not leave the customer charged.
7. If any step fails, roll back the whole transaction or perform a compensating ledger credit with a clear failure state. Never leave a debit without an order/allocation/refund trail.
8. Return the actual allocation and its connection information only to the owning customer.
9. Send notification and write audit events.

Use a database function/RPC or backend transaction service with row-level locking. Add concurrency tests for simultaneous purchases.

## 3. Brand and visual design system

### 3.1 Brand identity

Brand name is **BUYBIZ**. The reference image shows a compact white symbol and BUYBIZ wordmark. Create a polished, original BUYBIZ vector logo:
- Simple, recognizable geometric mark inspired by the bold, compact symbol in the reference.
- “BUYBIZ” wordmark in a strong modern sans-serif.
- White version for dark surfaces; near-black version for light surfaces.
- Provide SVG source and favicon/app icon variants.
- Do not use a low-resolution crop of the screenshot as the production logo.
- Do not imitate another existing company's registered logo. Create an original mark with the same compact, premium visual character.

### 3.2 Visual reference

Use `reference/buybiz-ui-reference.png` as the visual reference. It contains:
- Top-left: dark landing page with navigation, strong hero headline, large glossy digital marketplace visual, CTA buttons, trust metrics and white services panel.
- Top-right: light customer dashboard with black sidebar, search/top bar, welcome heading, compact metric tiles, dark chart panel, recent transactions and popular products.
- Bottom-left: mobile customer dashboard examples.
- Bottom-middle: light marketplace with category sidebar and product grid.
- Bottom-right: dark admin dashboard with black sidebar, summary metrics, charts and top products.

Match the overall visual language:
- Premium black and white; neutral greys for secondary surfaces.
- Glossy, high-contrast, polished surfaces; restrained highlights and realistic soft shadows.
- Clear typography, generous but controlled spacing, crisp alignment.
- Thin, subtle separators only where useful.
- Cards should have modest corner radii, not exaggerated pill shapes.
- Buttons should be clean, high-contrast and consistent.
- Use icons only when they communicate meaning. Keep icon style consistent.
- Provide a genuine dark mode and light mode. The landing hero should strongly resemble the dark reference; dashboard surfaces should support both themes.
- Respect accessibility: readable contrast, keyboard focus, labels, reduced motion and responsive text sizes.

Suggested palette (tune to match the screenshot):
- Primary dark: `#08090B`
- Dark surface: `#111316`
- Dark elevated surface: `#191C20`
- Light background: `#F5F5F6`
- White surface: `#FFFFFF`
- Primary text on light: `#101114`
- Secondary text: `#6E7178`
- Primary text on dark: `#F7F7F8`
- Subtle border: `#E4E5E8` light / `#292C31` dark
- Accent: use a restrained neutral/silver treatment. Do not introduce bright gradients or random neon colors.

Typography:
- Use a clean contemporary sans-serif such as Geist, Inter or a close equivalent.
- Strong headline weight, compact line height, restrained letter spacing.
- Ensure the logo wordmark and UI typography look intentional and consistent.

### 3.3 Homepage visual requirements

Create a premium landing page closely following the top-left reference composition:

**Header**
- BUYBIZ logo at left.
- Navigation: Products, Solutions (or How It Works), Resources, Pricing.
- Right side: Log In and Get Started.
- Dropdown menus should work on desktop and keyboard; mobile navigation should be clean.

**Hero**
- Dark, nearly black hero section.
- Left: headline such as “Your One-Stop Digital Marketplace” or an equally concise brand headline.
- Supporting copy should accurately describe the live proxy product and future services without implying unavailable products are live.
- Primary CTA: “Explore Proxies” / “Get Started”.
- Secondary CTA: “How It Works”.
- Right: original premium 3D-style marketplace artwork or a carefully composed visual asset inspired by the glossy black reference. It should not be a random generic AI illustration.
- Add trust/statistics only when real data exists. Do not fabricate “1M customers”, “99.9% uptime” or other claims. Until real metrics exist, use factual value propositions such as “Secure checkout”, “Clear pricing” and “Support when you need it”.

**Services panel**
- Light panel overlapping or following the hero as in reference.
- Live card: Proxies  -  residential/mobile/datacenter only if the actual inventory supports those categories.
- Coming Soon card: Virtual Phone Numbers.
- Coming Soon card: PayPal Services.
- Optional “Other services” card only if clearly marked as future roadmap and not purchasable.
- Make the live proxy card visually primary.
- “Coming Soon” cards must be non-purchasable and must not lead to broken checkout.

**Other homepage sections**
1. Short “Why BUYBIZ” section with truthful benefits.
2. How it works: Create account → Fund wallet → Choose proxy plan → Receive proxy details.
3. Proxy plans with the exact prices and durations.
4. Coming soon section for virtual numbers and PayPal-related services.
5. FAQ.
6. Support/contact CTA.
7. Footer with About, Marketplace, Help/FAQ, Terms, Privacy and Contact.

Avoid inventing guarantees, service-level agreements, provider partnerships, uptime percentages, customer counts or testimonials. Use clearly labeled placeholder copy only in development.

### 3.4 Public pages to build

- `/`  -  Home
- `/about`  -  About BUYBIZ and its purpose; no invented company history.
- `/marketplace`  -  proxy plans, category filters if inventory supports them, availability state and clear prices.
- `/how-it-works`  -  wallet and proxy purchase workflow.
- `/pricing`  -  exact launch packages and clear terms.
- `/faq`  -  common questions, expiry, shared proxy explanation, wallet refunds.
- `/contact`  -  support contact form and official contact details supplied later; do not invent email/phone addresses.
- `/terms`  -  draft terms clearly marked for legal review before launch.
- `/privacy`  -  draft privacy notice clearly marked for legal review before launch.
- `/coming-soon` or individual service detail pages  -  virtual phone numbers and PayPal services, with no checkout.

### 3.5 Responsive/mobile design

The reference includes mobile dashboards. Implement real responsive layouts, not a desktop-only screenshot:
- Mobile navigation becomes a compact drawer or bottom navigation where appropriate.
- Dashboard sidebar becomes a drawer or bottom nav.
- Tables become readable stacked rows or horizontally scrollable tables.
- Keep important actions accessible with thumb-friendly controls.
- Do not simply shrink the desktop UI.
- Test at 360px, 390px, 768px, 1024px and wide desktop sizes.
- Maintain the same polished visual language across all breakpoints.

## 4. Customer application

### 4.1 Customer dashboard navigation

Use a persistent sidebar on desktop and a mobile navigation adaptation.

Navigation:
- Overview
- Marketplace
- My Proxies / Active Services
- My Orders
- Wallet
- Transactions
- Support
- Settings

Top bar:
- Search (only if it has useful working search behavior)
- Notifications
- Theme toggle
- Profile menu

### 4.2 Customer overview

Show real values:
- Wallet balance (NGN)
- Total orders
- Active proxy services
- Pending support tickets (if applicable)
- Activity chart based on actual ledger/order events
- Recent transactions
- Active proxies with expiry countdown/status
- Quick action to purchase a proxy

Do not show fake growth percentages or invented metrics. If there is not enough history, show an honest empty state.

### 4.3 Marketplace and checkout

- Show three proxy plan cards: ₦500 / 24 hours, ₦1,000 / 7 days, ₦3,000 / 30 days.
- Display availability honestly. If no eligible inventory exists, disable the purchase CTA or allow a purchase attempt that immediately refunds to wallet with a clear explanation. Prefer checking availability before confirmation, but re-check transactionally at purchase time.
- Checkout confirmation must show product, duration, amount, wallet balance after purchase (estimated), and shared-proxy disclosure.
- Require an explicit confirmation before debiting wallet.
- Never expose another customer's identity or allocation.
- After success, show the assigned connection details and expiry timestamp.
- Add copy buttons for host, port, username and password. Copy actions must not leak credentials to analytics/logging.
- If the assigned proxy is shared, clearly label it “Shared proxy” and explain that up to 10 customers may use the same upstream proxy/IP.
- Show the customer their own access period and expiry, not the inventory's private admin notes.

### 4.4 My Proxies

- Active, expired, interrupted/refunded tabs or filters.
- Show package, assigned proxy connection details, activation time, expiry time, time remaining and status.
- Credentials visible only to the owner of that allocation.
- Once expired, hide or mask credentials by default and show an expired status.
- Never claim that access has been technically revoked if the underlying shared upstream credentials remain valid.

### 4.5 Orders and transactions

- Orders list: order number, product, amount, date, status, allocation/refund state.
- Transaction list: wallet deposit, purchase debit, refund credit, admin adjustment.
- Each transaction has a reference, timestamp and status.
- Provide order detail page with an audit-friendly event timeline.
- Do not allow customers to edit ledger entries or mark payments as successful.

### 4.6 Wallet

- Show available BUYBIZ balance and ledger history.
- “Add Funds” starts Paystack checkout.
- No withdrawal feature in launch version. Do not show a withdrawal CTA.
- Explain that BUYBIZ wallet credit is for purchases on BUYBIZ and is not cash-withdrawable in the initial release.
- Deposit minimum/maximum must be configurable by admin and displayed before checkout.
- Credit wallet only after trusted server-side payment verification.

## 5. Authentication and account onboarding

Use Supabase Auth.

### 5.1 Required sign-in methods

- Email + password
- Google OAuth
- Apple OAuth

Display clear buttons for “Continue with Google” and “Continue with Apple”, plus email/password form. Do not visually present a provider as configured until its credentials and redirect URLs have been set in Supabase.

### 5.2 Registration fields

The requested minimum registration form is:
- Username
- Email
- Password

Username must be unique (case-insensitive) and validated server-side. Store it in a `profiles` table linked to the Supabase Auth user ID. Email verification should be enabled before users can make purchases, unless the owner explicitly decides otherwise.

For Google/Apple sign-in, create the profile after the first successful OAuth callback. If username is not provided by the provider, ask the user to choose a unique username in a short onboarding step before entering the full dashboard. Do not assume Apple always returns a person's name on subsequent sign-ins.

### 5.3 Auth UX and security

- Login, register, forgot password, reset password, verify email, OAuth callback and logout.
- Secure server-side session handling for Next.js.
- Protect dashboard routes and APIs.
- Do not trust user-editable metadata for admin roles.
- Assign roles only through a trusted server/admin operation.
- Use Supabase Auth's supported SSR integration and current package recommendations.
- Configure exact redirect URLs for local, staging and production environments.
- Add rate limiting and abuse protection to login, registration, password reset and username availability checks.
- Do not expose provider client secrets in the browser.

## 6. Admin dashboard

The admin dashboard should closely follow the bottom-right dark dashboard in the reference. It should also support the global light/dark theme.

### 6.1 Admin navigation

- Overview
- Users
- Proxy Inventory
- Allocations
- Products & Pricing
- Orders
- Deposits
- Wallet Ledger
- Refunds / Adjustments
- Expenses
- Support Tickets
- Analytics
- Audit Logs
- Settings

### 6.2 Admin overview

Show real, database-derived metrics:
- Total users
- Total successful deposits
- Total sales
- Active proxy allocations
- Available proxy seats
- Total wallet liability (sum of customer available balances)
- Revenue and estimated gross profit
- Recent orders/deposits
- Sales by proxy package
- Inventory utilization

Financial reporting definitions must be explicit:
- **Deposits:** successfully verified Paystack payments.
- **Sales:** completed proxy purchases.
- **Refunds:** internal wallet credits that reverse failed/unfulfilled purchases.
- **Wallet liability:** total outstanding customer wallet balances.
- **Expenses:** admin-entered operating costs and proxy acquisition costs.
- **Gross margin/profit estimate:** sales revenue minus recorded direct proxy costs and refunds, with gateway fees and other costs shown separately where data exists.
- Do not count a wallet deposit as revenue. A deposit is a liability until spent.
- Do not count a wallet refund as new revenue.
- Prevent double-counting wallet deposits, sales, refunds and expenses.

### 6.3 Proxy inventory management

Admin can:
- Add one proxy manually.
- Add multiple proxies through a carefully validated CSV import (optional phase 2).
- View available/full/paused/expired inventory.
- Search/filter by protocol, status, upload date, expiry and region.
- See active seat count / maximum seats.
- See remaining upstream lifetime.
- Pause or disable inventory.
- Edit non-sensitive metadata.
- Rotate/update credentials with a warning that shared customers may be affected.
- View all allocations linked to a proxy.
- View purchase cost and inventory utilization.
- Reveal credentials only after permission check and audit event.
- Never delete inventory that has financial/allocation history; use archive/disable.

### 6.4 User management

- Search users by username/email/ID.
- View account status, registration date, wallet balance, order history and support history.
- Suspend/reactivate account with reason and audit event.
- Admin cannot impersonate a user silently.
- Wallet adjustment requires reason, confirmation and audit record.
- Never let an admin directly edit a calculated wallet balance.

### 6.5 Refunds and manual adjustments

- Automatic no-stock refund is handled by the purchase transaction.
- Admin can issue a wallet credit/debit adjustment only with a reason and elevated permission.
- Require confirmation for financial actions.
- Every adjustment creates an immutable ledger entry and audit log.
- Prevent negative wallet balance unless a specifically approved administrative correction workflow is used.
- Refunds are internal wallet credits only in launch version.

### 6.6 Expenses and reporting

Admin can record expenses:
- Description/category
- Amount in NGN
- Date
- Optional linked proxy inventory item/order
- Notes and attachment/reference if implemented securely

Use expense records and proxy purchase costs to calculate estimated profit. Display formulas and date ranges.

## 7. Wallet and payment workflow (Paystack)

Use Paystack for deposits into the BUYBIZ internal wallet. Integrate in test mode first.

### 7.1 Deposit flow

1. Customer enters an amount within configured limits.
2. Backend creates a pending deposit record with a unique internal ID and unique Paystack reference.
3. Backend initializes the Paystack transaction using the secret key stored in Render environment variables.
4. Browser redirects to Paystack's hosted checkout URL.
5. Customer returns to the callback page.
6. Backend verifies transaction status with Paystack's verify endpoint and/or processes the signed webhook.
7. Confirm reference, expected amount, currency, customer association and successful status.
8. In a database transaction, mark deposit successful and create exactly one wallet credit ledger entry.
9. Idempotency: duplicate callbacks/webhooks must never credit twice.
10. Display updated wallet balance and receipt.

### 7.2 Webhook requirements

- Verify Paystack webhook signature using the current official Paystack method and the raw request body. Do not parse/re-serialize the payload before signature verification.
- Support the currently documented signature header format and secret rotation if required by the current Paystack docs.
- Reject invalid signatures.
- Store webhook event IDs/references and processed status.
- Make processing idempotent.
- Never credit a wallet solely because the browser says payment succeeded.
- Verify amount and currency against the pending deposit.
- Log safe metadata only; never log secret keys or full payment credentials.

### 7.3 Payment states

Use explicit states such as:
`initiated`, `pending`, `successful`, `failed`, `abandoned`, `reversed`, `credited`.

Keep gateway payment status separate from wallet ledger status. A successful payment should only create one credit entry.

## 8. Suggested technical architecture

Use a TypeScript-first stack with clear separation of UI and business logic.

### 8.1 Recommended stack

- **Framework:** Next.js App Router + React + TypeScript.
- **Styling:** Tailwind CSS with a small, documented design-token system.
- **UI primitives:** Accessible components (for example, shadcn/ui or Radix primitives) customized heavily to match BUYBIZ. Do not ship default-looking component-library styles.
- **Icons:** Lucide, used sparingly and consistently.
- **Charts:** Recharts or another maintained chart library; chart only real data.
- **Backend/database/auth:** Supabase Postgres, Supabase Auth, Supabase Storage only where needed, Supabase Edge Functions or Next.js server routes for trusted operations.
- **Validation:** Zod or equivalent shared schemas.
- **Forms:** React Hook Form or equivalent.
- **Testing:** Vitest/Jest for unit tests, Playwright for end-to-end tests, and Supabase database/RLS tests.
- **Hosting:** Render Node web service for the full Next.js application.
- **Payments:** Paystack hosted checkout + server-side verification/webhook.
- **Source control:** GitHub repository with protected main branch and environment separation.

Do not split the app into microservices for this initial stage. A well-structured Next.js application with Supabase is simpler to operate.

### 8.2 Render hosting clarification

Render is the application hosting platform/domain host in this architecture. Deploy the full Next.js application as a **Render Web Service**, not a static export, because the app requires server-side routes, authentication callbacks, payment verification and secure business logic. Render provides an `onrender.com` service URL and supports custom domains and environment variables. Use the `PORT` environment variable and bind the server to `0.0.0.0` as required by Render.

Supabase remains the managed backend platform for Postgres/Auth and related backend services. Render does not replace Supabase. Use a custom domain later when supplied by the owner.

### 8.3 Application architecture

Prefer a modular monolith:
- `app/`  -  route segments and pages
- `components/`  -  shared UI components
- `features/auth/`
- `features/marketplace/`
- `features/proxies/`
- `features/wallet/`
- `features/orders/`
- `features/admin/`
- `lib/supabase/`  -  browser/server Supabase clients
- `lib/paystack/`
- `lib/security/`
- `lib/validation/`
- `lib/formatting/`
- `server/`  -  server-only use cases and repositories
- `supabase/migrations/`
- `supabase/tests/`
- `tests/e2e/`
- `public/brand/`  -  logo SVGs and favicon
- `reference/`  -  supplied UI screenshot

Use server components by default where suitable. Use client components only for actual interactivity. All privileged operations must run server-side or in secured database functions.

## 9. Database design (initial schema)

Design migrations with foreign keys, constraints, indexes, timestamps, and RLS. Exact SQL can be refined by the agent, but preserve these entities and invariants.

### 9.1 Tables

**`profiles`**
- `id` UUID primary key referencing `auth.users.id`
- `username` unique case-insensitive
- `display_name` nullable
- `avatar_url` nullable
- `role` enum: `customer`, `support`, `admin`, `super_admin` (role changes only through trusted server operation)
- `status` enum: `active`, `suspended`, `pending_verification`
- `created_at`, `updated_at`

**`products`**
- `id`
- `slug` unique
- `name`
- `description`
- `duration_seconds`
- `price_kobo` or integer NGN minor units (choose one consistent representation; store currency explicitly)
- `currency` default `NGN`
- `is_active`
- `is_coming_soon`
- `sort_order`
- timestamps

**`proxy_inventory`**
- `id`
- `label`
- `protocol`
- `host`
- `port`
- `encrypted_username`
- `encrypted_password`
- `region`
- `provider_note`
- `purchase_cost_minor`
- `currency`
- `max_seats` default 10
- `uploaded_at`
- `upstream_expires_at`
- `status`
- `created_by`
- timestamps

**`proxy_allocations`**
- `id`
- `user_id`
- `proxy_inventory_id`
- `order_id`
- `product_id`
- `status`: `active`, `expired`, `interrupted`, `revoked`
- `activated_at`
- `expires_at`
- `created_at`
- indexes on inventory/status/expiry and user/status/expiry

**`orders`**
- `id`
- `order_number` unique
- `user_id`
- `product_id`
- `amount_minor`
- `currency`
- `status`: `pending`, `completed`, `unfulfilled`, `refunded`, `cancelled`
- `failure_reason`
- `idempotency_key`
- timestamps

**`wallet_accounts`**
- `id`
- `user_id` unique
- `currency`
- timestamps

**`wallet_ledger`**
- `id`
- `wallet_account_id`
- `user_id`
- `entry_type`: `deposit_credit`, `purchase_debit`, `refund_credit`, `admin_credit`, `admin_debit`, `reversal`
- `amount_minor` signed integer with clear sign convention
- `currency`
- `reference` unique where appropriate
- `related_order_id` nullable
- `related_deposit_id` nullable
- `description`
- `created_by` nullable
- `created_at`
- Never update or delete financial ledger entries; corrections are new reversing entries.

**`deposits`**
- `id`
- `user_id`
- `provider` (`paystack`)
- `provider_reference` unique
- `amount_minor`
- `currency`
- `status`
- `provider_transaction_id` nullable
- `verified_at`
- timestamps

**`expenses`**
- `id`
- `description`
- `category`
- `amount_minor`
- `currency`
- `expense_date`
- `proxy_inventory_id` nullable
- `created_by`
- timestamps

**`support_tickets`** and **`support_messages`**
- Ticket owner, subject, category, priority, status and timestamps.
- Messages linked to ticket and author.
- RLS must prevent customers reading other customers' tickets.

**`notifications`**
- `id`, `user_id`, `type`, `title`, `body`, `read_at`, `created_at`.

**`audit_logs`**
- `id`, `actor_user_id`, `action`, `entity_type`, `entity_id`, safe metadata JSON, IP/user-agent where lawful and necessary, `created_at`.
- Append-only for application roles; never include plaintext proxy credentials, passwords, tokens or payment secrets.

**`webhook_events`**
- `id`, `provider`, `provider_event_reference`, `event_type`, `payload_hash`, `status`, `received_at`, `processed_at`, safe error detail.
- Unique provider/event reference or another idempotency key.

**`app_settings`**
- Configurable inventory seat default, stock safety buffer, deposit limits, support settings, maintenance mode and other non-secret application settings.
- Do not store secrets here.

### 9.2 Money representation

Use integer minor units consistently. For NGN, decide and document whether values are stored in kobo (₦1 = 100 kobo) or whole naira; kobo is recommended for gateway compatibility. Never use floating-point arithmetic for money. Format amounts for display as NGN.

### 9.3 Wallet balance calculation

- The source of truth is the sum of valid ledger entries for the user's wallet.
- A cached balance may be maintained for performance only if updated transactionally and periodically reconciled against the ledger.
- Customers must not be able to insert/update/delete ledger entries.
- All balance-changing operations must be trusted server/database transactions.

### 9.4 RLS and permissions

Enable RLS for every exposed table. Write explicit policies and least-privilege grants:
- Customers can read/update only allowed fields on their own profile.
- Customers can read only their own wallet ledger, deposits, orders, allocations, notifications and support tickets.
- Customers cannot directly write financial entries, proxy inventory, allocations, order status, roles or admin settings.
- Admin operations must be server-authorized with role checks.
- Never expose Supabase service-role/secret keys in client code.
- Do not trust `user_metadata` as an authorization source.
- Add automated allow/deny tests for every important RLS policy.

## 10. Security and reliability requirements

Security is a launch requirement, not a later polish task.

- Keep Supabase secret/service role keys and Paystack secret/signing keys server-side only.
- Use HTTPS in production.
- Validate every request server-side with schemas.
- Add rate limits to auth, payment initialization, purchase, support submission and sensitive admin operations.
- Use CSRF protections where applicable and secure, HTTP-only, SameSite cookies for sessions.
- Use strict authorization checks on every admin route and API.
- Require MFA for admin/super-admin accounts where supported; at minimum, enforce strong authentication and do not use shared admin accounts.
- Add audit logs for inventory changes, credential reveal/rotation, wallet adjustments, suspensions, price changes and refunds.
- Encrypt proxy usernames/passwords at rest with authenticated encryption; use key rotation strategy and never log secrets.
- Do not place proxy credentials in URLs, query strings, analytics, error reports or browser local storage.
- Prevent IDOR: changing an order/allocation UUID must never expose another user's details.
- Use idempotency keys for purchases, wallet deposits, webhook processing and refunds.
- Use database constraints and row locks for inventory seat capacity and wallet debit.
- Add safe error messages; do not expose stack traces or secrets to end users.
- Add security headers, content security policy, input sanitization and dependency scanning.
- Back up the database and test recovery procedures before production.
- Record admin IP/session metadata only as appropriate and disclose privacy practices.
- Do not implement any feature that claims to bypass platform verification, evade bans or facilitate fraud. The product is a legitimate proxy marketplace and must follow applicable laws and supplier terms.

## 11. Scheduled jobs and lifecycle processing

Use Supabase Cron/database functions or a secured scheduled job to:
- Mark customer allocations expired when `expires_at <= now()`.
- Mark inventory expired when `upstream_expires_at <= now()`.
- Reconcile inventory status and active seat counts.
- Reconcile cached wallet balances against immutable ledger.
- Detect pending deposits that need verification/reconciliation.
- Generate notifications for expiry or interruption.
- Record job execution status and failures.

The expiry job must only expire the individual allocation. It must never disable a shared inventory item just because one customer's package ended. If the upstream inventory itself expires, handle all affected allocations transparently and apply the configured customer remedy/refund policy.

## 12. Coming-soon services

Create visible, polished sections/cards for:

**Virtual Phone Numbers  -  Coming Soon**
- Explain only that the service is planned.
- No purchase button, checkout, price, inventory, fake country list or fake number.
- Optional “Notify me” waitlist only if the owner approves collecting emails and a privacy notice is added.

**PayPal Services  -  Coming Soon**
- Display as planned, without claiming an active PayPal partnership or offering account/payment services.
- No purchase, no request form and no operational promise until owner provides detailed scope and legal/compliance review.

Design the system so these can become separate product categories later without redesigning the whole app.

## 13. About, content and legal copy

Write polished but factual copy. Do not invent:
- Founding year
- Founder identity
- Customer counts
- Reviews/testimonials
- Provider partnerships
- Certifications
- Uptime/service guarantees
- Office address or contact information

The About page should explain BUYBIZ as a digital services marketplace that begins with proxy access and plans to expand its service categories. Terms and Privacy pages are draft templates and must be flagged for legal review before public launch. Include clear terms around shared proxies, customer package duration, upstream availability, wallet credits, no cash withdrawals in the initial version, refunds, prohibited use, privacy and support.

## 14. Build phases and acceptance criteria

### Phase 1  -  Project foundation and design system
- Set up Next.js, TypeScript, Tailwind, Supabase clients, linting and formatting.
- Create BUYBIZ logo assets and design tokens.
- Implement header/footer, buttons, form controls, cards, sidebar, topbar, tables, dialogs, empty states, loading states and error states.
- Implement dark/light mode.
- Match the screenshot's layout and polish.
- Acceptance: pages render cleanly at mobile/tablet/desktop; no placeholder lorem ipsum; no broken links.

### Phase 2  -  Public website
- Home, About, Marketplace, How It Works, Pricing, FAQ, Contact, Terms, Privacy.
- Coming Soon sections for phone numbers and PayPal.
- Acceptance: all navigation works, prices match the launch list, coming-soon services cannot be purchased.

### Phase 3  -  Authentication
- Email/password signup with username, Google OAuth and Apple OAuth.
- Email verification, password reset, OAuth callback, username onboarding.
- Customer/admin route guards.
- Acceptance: duplicate username rejected, user cannot self-assign admin, social sign-in creates profile exactly once.

### Phase 4  -  Database and security
- Migrations, RLS, grants, indexes, constraints, audit logs, tests.
- Acceptance: customer A cannot read customer B's wallet/order/proxy/ticket; anonymous users cannot access private data; service secrets never appear in client bundles.

### Phase 5  -  Wallet and Paystack
- Deposit creation, hosted checkout, webhook signature verification, server-side verification, idempotent wallet credit and transaction history.
- Acceptance: valid payment credits exactly once; invalid/duplicate webhook does not credit; amount mismatch rejected; browser callback alone cannot credit.

### Phase 6  -  Proxy inventory and allocation
- Admin manual proxy upload, seat counter, package eligibility, atomic allocation, customer connection details, independent expiry and no-stock wallet refund.
- Acceptance: no proxy exceeds 10 active allocations; simultaneous purchase tests pass; no stock results in exactly one wallet refund; one customer's expiry does not affect the other nine; insufficient upstream lifetime prevents sale.

### Phase 7  -  Admin operations and reporting
- Users, products/prices, inventory, orders, deposits, wallet ledger, refunds, expenses, support and audit log.
- Acceptance: metrics reconcile with database records; deposits are not counted as sales; wallet liability is correctly calculated; every financial/admin action is audited.

### Phase 8  -  QA and deployment
- Unit, integration, RLS, concurrency and Playwright tests.
- Deploy to Render staging, configure Supabase production/staging URLs, OAuth callbacks, Paystack test keys, webhook and environment variables.
- Verify health check, logs, HTTPS, backup and rollback.
- Switch Paystack to live only after owner approval and end-to-end test completion.

## 15. Required tests (minimum)

1. Signup with username/email/password.
2. Duplicate username case-insensitive rejection.
3. Google OAuth callback and profile creation.
4. Apple OAuth callback and username onboarding.
5. Customer cannot access admin pages/API.
6. Customer cannot read another customer's data.
7. Wallet ledger cannot be modified from client.
8. Paystack successful deposit credits once.
9. Duplicate webhook does not double-credit.
10. Invalid webhook signature rejected.
11. Wrong amount/currency/reference does not credit.
12. Purchase with insufficient balance fails safely.
13. Purchase with stock available debits once and allocates once.
14. Purchase with no eligible stock refunds wallet once.
15. Concurrent purchases never allocate more than 10 active seats to one proxy.
16. 24-hour allocation expires after 24 hours.
17. 7-day allocation expires after 7 days.
18. 30-day allocation expires after 30 days.
19. Expiring one customer's allocation does not change other allocations.
20. Inventory expiry prevents new allocation.
21. Package is rejected if inventory expiry is earlier than customer expiry plus safety buffer.
22. Admin credential reveal is permission-checked and audited.
23. Suspended customer cannot purchase.
24. Customer cannot withdraw wallet balance.
25. Reports reconcile deposits, sales, refunds, expenses and wallet liabilities.

## 16. Official documentation to consult

The coding agent must verify the current instructions and versions before implementation:

- Next.js App Router: https://nextjs.org/docs/app
- Next.js authentication guide: https://nextjs.org/docs/app/guides/authentication
- Next.js deployment: https://nextjs.org/docs/app/getting-started/deploying
- Supabase Auth overview: https://supabase.com/docs/guides/auth
- Supabase Next.js SSR: https://supabase.com/docs/guides/auth/server-side/nextjs
- Supabase Google sign-in: https://supabase.com/docs/guides/auth/social-sign-in/auth-google
- Supabase Apple sign-in: https://supabase.com/docs/guides/auth/social-sign-in/auth-apple
- Supabase redirect URL configuration: https://supabase.com/docs/guides/auth/redirect-urls
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase secure data: https://supabase.com/docs/guides/database/secure-data
- Supabase database functions: https://supabase.com/docs/guides/database/functions
- Supabase Cron: https://supabase.com/docs/guides/cron
- Render Next.js deployment: https://render.com/docs/deploy-nextjs-app
- Render web services: https://render.com/docs/web-services
- Render environment variables: https://render.com/docs/configure-environment-variables
- Paystack transaction API: https://paystack.com/docs/api/transaction/
- Paystack verify payments: https://paystack.com/docs/payments/verify-payments/
- Paystack webhooks: https://paystack.com/docs/payments/webhooks/

If any link or package path has changed, locate the current official equivalent and record the correction in README.

## 17. Environment variables

Create `.env.example` with names and blank placeholder values only. Adapt to the current Supabase SDK conventions.

Example variable names:
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` (server only; use the current recommended Supabase secret key format)
- `PAYSTACK_SECRET_KEY` (server only)
- `PAYSTACK_PUBLIC_KEY` (only if required by the chosen integration)
- `PAYSTACK_WEBHOOK_SECRET` (server only; follow current Paystack signature method)
- `PROXY_CREDENTIAL_ENCRYPTION_KEY` (server only; strong generated key)
- `CRON_SECRET` (server only, if a secured external scheduled endpoint is used)
- `SENTRY_DSN` (optional, only if error monitoring is configured)

Do not invent values. Do not commit `.env`, `.env.local`, private keys or real credentials. Use Render's environment-variable interface for production secrets.

## 18. Deployment workflow

1. Create Supabase project(s) for development/staging and production.
2. Apply version-controlled SQL migrations.
3. Configure Supabase Auth email settings and redirect allow-list.
4. Create Google OAuth credentials and configure the Google provider in Supabase.
5. Create Apple Service ID/key configuration and configure Apple provider in Supabase.
6. Set local `.env.local` using the owner's own secret values.
7. Run tests and verify email/OAuth callbacks locally.
8. Push code to GitHub.
9. Create a Render Web Service connected to the repository.
10. Set build/start commands based on the generated package manager and Next.js project. Ensure full Node server deployment, not static export.
11. Set production environment variables in Render.
12. Add Render URL to Supabase Auth site URL and redirect allow-list.
13. Configure Paystack test webhook to the deployed endpoint and verify signature handling.
14. Test deposits and wallet credits in Paystack test mode.
15. Run all acceptance tests against staging.
16. Attach custom domain when the owner supplies it; configure DNS and HTTPS.
17. Only switch to live payment keys after explicit owner approval.
18. Confirm backup, logs, monitoring, rollback and admin MFA.

## 19. Open decisions  -  do not guess

The owner has not yet supplied these details. Build configuration points/placeholders and ask only when the implementation reaches the relevant step:

1. **Stock expiry conflict:** Is every manually uploaded proxy guaranteed to expire 30 days after upload, or should admin enter the actual supplier expiry date? A 30-day customer package cannot be guaranteed if the upstream proxy has less than 30 days remaining.
2. **Technical individual revocation:** Are uploaded upstream proxies capable of per-customer usernames/passwords/ports or API-based session revocation? If not, individual expiry can only hide/restrict access inside BUYBIZ, not revoke a shared upstream credential at network level.
3. **Proxy types/regions:** Which proxy types and locations will be stocked at launch? Only display types actually available.
4. **Support contacts:** Official support email, WhatsApp or other channel.
5. **Brand assets:** Owner may later provide a final logo or preferred font. Until then create an original BUYBIZ logo based on the screenshot.
6. **Paystack configuration:** Owner must provide/configure their own Paystack account and keys directly in Render/Supabase setup; never request secrets in chat.
7. **Apple and Google credentials:** Owner must create provider credentials and enter them in provider dashboards.

## 20. Final delivery checklist for the coding agent

Before declaring the project complete, provide:

- Working BUYBIZ website and customer dashboard.
- Working admin dashboard.
- Original BUYBIZ logo in SVG and favicon formats.
- Dark and light themes.
- All public pages and responsive layouts.
- Supabase schema migrations and RLS policies.
- Email/password, Google and Apple authentication integration.
- Paystack deposit flow with secure webhook verification.
- Wallet ledger and no-withdrawal rule.
- Manual proxy inventory upload and secure credential storage.
- Ten-seat allocation with atomic concurrency protection.
- 24-hour, 7-day and 30-day customer expiry logic.
- No-stock automatic wallet refund.
- Admin analytics, expenses and reconciled financial reporting.
- Unit, integration, RLS, concurrency and end-to-end tests.
- `.env.example`, README and Render deployment instructions.
- A list of any features blocked by missing owner credentials or unresolved business decisions.

**Definition of done:** The system must be visually faithful to the supplied reference, function end-to-end in a staging environment, pass the required tests, and never claim a payment, refund, allocation, proxy revocation or service availability that has not actually happened.
