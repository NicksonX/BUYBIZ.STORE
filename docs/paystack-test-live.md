# Paystack test mode and live mode

## Your questions

### 1. Does replacing the test keys with live keys reset wallet balances?

No. Keys only decide which Paystack API the server talks to. Database rows are not changed by a key replacement.

### 2. Do test transactions remain in Supabase?

Yes. Every test deposit, order, allocation and ledger entry stays in the same database unless it is explicitly deleted or moved. We have not deleted any.

### 3. Will users still see test history after switching keys?

Yes, if the live deployment points at the same database. Wallet balances and transaction lists are derived from the ledger and are not filtered by Paystack mode today.

### 4. What is the safest way to make every real wallet start at zero?

Use a separate, fresh Supabase project for live. Apply the migrations there. The live project starts with an empty ledger and no test orders or inventory. The test project stays intact for auditing.

This is safer than deleting test rows from a shared database.

### 5. Can test and live records be separated without deleting history?

Yes.

Recommended: keep the current Supabase project as the test project and create a second Supabase project for live. Point the live deployment at the second project.

Alternative for a future single-database setup: add an `environment` column to deposits, orders, allocations, inventory, referrals, renewals and the wallet ledger, then filter every query by the current environment. That is a larger change and was not applied because it changes the financial schema and needs approval.

## Current protections

The code already has:

- server-side Paystack verification;
- HMAC-SHA512 webhook verification over the raw body;
- amount, currency and reference checks;
- Paystack mode check against the payment `domain`;
- unique deposit and ledger references;
- idempotent deposit crediting;
- webhook event deduplication;
- immutable wallet ledger entries;
- a separate wallet debit and refund trail.

These protect individual payments. They do not separate two sets of historical rows by themselves.

## Clean live launch procedure

1. Create a new Supabase project named something like `buybiz-live`.
2. Run all migrations against the new project.
3. Create the owner account and promote it to `super_admin`.
4. Deploy the app with the live project's `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` and publishable key.
5. Use the live Paystack secret key and set `PAYSTACK_MODE=live`.
6. Configure the live webhook: `https://buybiz.store/api/paystack/webhook`.
7. Test one small live payment and reconcile it in the Paystack dashboard.
8. Keep the test project for audit history.

The live project will have zero wallet balances, zero test orders and no test inventory. That is the clean starting point.

Do not point live Paystack keys at the current test database unless the environment-column design is approved and implemented.
