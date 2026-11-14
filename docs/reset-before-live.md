# Pre-live reset procedure — executed 2026-11-14 (full reset; both admins preserved)

No reset has been executed. This document and `docs/reset-before-live.sql` are prepared for review.

## What will be deleted

- All customer profiles and auth users except the owner admin.
- All wallet accounts, wallet ledger entries and wallet transfers.
- All deposits, orders, proxy allocations, renewals and referrals.
- All proxy inventory, including test inventory. Real inventory must be added again after launch.
- All support tickets, support messages and contact messages.
- All notifications, rate limits, job runs and webhook events.
- All public audit logs.
- All recorded expenses.
- All test balances and test transaction history.

## What will be preserved

- The admin auth user, identity, active sessions and super_admin profile.
- The database schema, tables, triggers, functions, indexes and RLS policies.
- The Supabase migration history.
- The product catalogue and prices.
- Application settings, including payment configuration.
- Storage bucket definitions.
- Google OAuth configuration in Supabase.

## Admin wallet

The admin account and privileges are preserved. The admin wallet and wallet history are cleared, so the admin balance is zero. This is intentional so every wallet starts clean.

## Safety

The SQL runs inside one transaction and aborts if the admin auth user is missing or is not an active super_admin. It can be rolled back if any statement fails. No application data will be deleted until the owner provides live Paystack keys and explicitly approves.

## Run command after approval

The owner should not run this manually. It will be applied against the Supabase pooler URL only after the live keys are set and approval is recorded.
