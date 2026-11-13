-- BUYBIZ pre-live reset procedure.
-- DO NOT RUN UNTIL:
--   1. live Paystack keys are configured, and
--   2. the owner has explicitly approved this reset.
--
-- This is not a migration and must never run automatically.
-- It preserves schema, migrations, products, settings and the admin identity.
-- It removes all customer accounts and all test financial and activity data.
--
-- The admin account below is preserved at the auth and profile level.
-- Its wallet and wallet history are cleared so every wallet starts at zero.

begin;

create temporary table _buybiz_admin_keep on commit drop as
select id
from auth.users
where lower(email) = lower('nicksonlabss@gmail.com');

do $$
begin
  if (select count(*) from _buybiz_admin_keep) <> 1 then
    raise exception 'Reset aborted: expected exactly one admin auth user.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    join _buybiz_admin_keep a on a.id = p.id
    where p.role = 'super_admin' and p.status = 'active'
  ) then
    raise exception 'Reset aborted: preserved account is not an active super_admin.';
  end if;
end $$;

-- Customer activity, support and counters
delete from public.notifications;
delete from public.support_messages;
delete from public.support_tickets;
delete from public.contact_messages;
delete from public.webhook_events;
delete from public.rate_limits;
delete from public.job_runs;
alter table public.audit_logs disable trigger audit_logs_no_delete;
delete from public.audit_logs;
alter table public.audit_logs enable trigger audit_logs_no_delete;

-- Referral and proxy lifecycle records depend on financial records
delete from public.email_deliveries;
delete from public.email_otps;
delete from public.email_preferences;
delete from public.email_campaigns;
delete from public.ambassador_ledger;
delete from public.ambassador_withdrawals;
delete from public.ambassador_commissions;
delete from public.ambassador_wallet_addresses;
delete from public.ambassador_profiles;
delete from public.referrals;
delete from public.proxy_renewals;
delete from public.proxy_terminations;
delete from public.proxy_switches;
delete from public.proxy_rotations;
delete from public.admin_notifications;
delete from public.account_reactivations;
delete from public.account_freezes;

-- Allocations depend on orders and inventory
delete from public.proxy_allocations;

-- The ledger references orders, deposits and transfers. Its append-only
-- trigger is temporarily disabled inside this reviewed transaction only.
alter table public.wallet_ledger disable trigger wallet_ledger_no_delete;
delete from public.wallet_ledger;
alter table public.wallet_ledger enable trigger wallet_ledger_no_delete;
delete from public.wallet_transfers;

-- Remove all test commercial records
delete from public.orders;
delete from public.deposits;
delete from public.wallet_accounts;
delete from public.expenses;
delete from public.proxy_inventory;

-- Remove every customer profile. The admin profile is preserved.
delete from public.profiles
where id not in (select id from _buybiz_admin_keep);

-- Remove every non-admin auth user. Admin identity and sessions are preserved.
delete from auth.identities
where user_id not in (select id from _buybiz_admin_keep);
delete from auth.sessions
where user_id not in (select id from _buybiz_admin_keep);
delete from auth.refresh_tokens
where user_id not in (select id from _buybiz_admin_keep);
delete from auth.users
where id not in (select id from _buybiz_admin_keep);

commit;

-- Verification after commit
select 'profiles' as table_name, count(*)::int as rows from public.profiles
union all select 'auth_users', count(*)::int from auth.users
union all select 'wallet_accounts', count(*)::int from public.wallet_accounts
union all select 'wallet_ledger', count(*)::int from public.wallet_ledger
union all select 'deposits', count(*)::int from public.deposits
union all select 'orders', count(*)::int from public.orders
union all select 'proxy_allocations', count(*)::int from public.proxy_allocations
union all select 'proxy_inventory', count(*)::int from public.proxy_inventory
union all select 'referrals', count(*)::int from public.referrals
union all select 'proxy_renewals', count(*)::int from public.proxy_renewals
union all select 'proxy_terminations', count(*)::int from public.proxy_terminations
union all select 'proxy_switches', count(*)::int from public.proxy_switches
union all select 'proxy_rotations', count(*)::int from public.proxy_rotations
union all select 'admin_notifications', count(*)::int from public.admin_notifications
union all select 'account_reactivations', count(*)::int from public.account_reactivations
union all select 'account_freezes', count(*)::int from public.account_freezes
union all select 'ambassador_profiles', count(*)::int from public.ambassador_profiles
union all select 'ambassador_commissions', count(*)::int from public.ambassador_commissions
union all select 'ambassador_withdrawals', count(*)::int from public.ambassador_withdrawals
union all select 'ambassador_ledger', count(*)::int from public.ambassador_ledger
union all select 'email_deliveries', count(*)::int from public.email_deliveries
union all select 'email_otps', count(*)::int from public.email_otps
union all select 'email_campaigns', count(*)::int from public.email_campaigns
union all select 'support_tickets', count(*)::int from public.support_tickets
union all select 'notifications', count(*)::int from public.notifications
union all select 'audit_logs', count(*)::int from public.audit_logs
union all select 'rate_limits', count(*)::int from public.rate_limits
union all select 'products', count(*)::int from public.products
union all select 'app_settings', count(*)::int from public.app_settings;

select p.id, p.email, p.role, p.status
from public.profiles p
join _buybiz_admin_keep a on a.id = p.id;
