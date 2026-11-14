-- BUYBIZ pre-live reset procedure (updated for campaign tables and dual admins).
-- Run manually, once, in a single transaction. Not a migration.

begin;

create temporary table _buybiz_admin_keep on commit drop as
select id
from auth.users
where lower(email) in (
  lower('web3caleb@gmail.com'),
  lower('nicksonlabss@gmail.com')
);

do $$
begin
  if (select count(*) from _buybiz_admin_keep) <> 2 then
    raise exception 'Reset aborted: expected exactly two admin auth users.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    join _buybiz_admin_keep a on a.id = p.id
    where lower(p.email) = lower('web3caleb@gmail.com')
      and p.role = 'super_admin' and p.status = 'active'
  ) then
    raise exception 'Reset aborted: web3caleb@gmail.com is not an active super_admin.';
  end if;
end $$;

-- Campaign and Ambassador USD records (must go before orders/deposits/referrals).
delete from public.reward_payout_items;
delete from public.reward_payouts;
delete from public.campaign_rewards;
delete from public.ambassador_ledger;
delete from public.ambassador_withdrawals;
delete from public.ambassador_commissions;
delete from public.ambassador_wallet_addresses;
delete from public.ambassador_profiles;

-- Customer activity, support and counters.
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

-- Referral and proxy lifecycle records.
delete from public.email_deliveries;
delete from public.email_otps;
delete from public.email_preferences;
delete from public.email_campaigns;
delete from public.referrals;
delete from public.proxy_renewals;
delete from public.proxy_terminations;
delete from public.proxy_switches;
delete from public.proxy_rotations;
delete from public.admin_notifications;
delete from public.account_reactivations;
delete from public.account_freezes;

-- Allocations depend on orders and inventory.
delete from public.proxy_allocations;

-- Immutable ledger cleared inside this reviewed transaction only.
alter table public.wallet_ledger disable trigger wallet_ledger_no_delete;
delete from public.wallet_ledger;
alter table public.wallet_ledger enable trigger wallet_ledger_no_delete;
delete from public.wallet_transfers;

-- Commercial and test records.
delete from public.orders;
delete from public.deposits;
delete from public.wallet_accounts;
delete from public.expenses;
delete from public.proxy_inventory;

-- Remove every non-admin profile.
delete from public.profiles
where id not in (select id from _buybiz_admin_keep);

-- Remove every non-admin auth identity/session/user.
delete from auth.identities
where user_id::text not in (select id::text from _buybiz_admin_keep);
delete from auth.sessions
where user_id::text not in (select id::text from _buybiz_admin_keep);
delete from auth.refresh_tokens
where user_id::text not in (select id::text from _buybiz_admin_keep);
delete from auth.users
where id::text not in (select id::text from _buybiz_admin_keep);

commit;

-- Record the reset itself in the freshly-cleared audit log.
insert into public.audit_logs (actor_user_id, actor_role, action, entity_type, entity_id, metadata)
select id, 'super_admin', 'system.prelive_reset', 'system', null,
       '{"scope":"full","executedAt":"2026-11-14","preservedAdmins":["web3caleb@gmail.com","nicksonlabss@gmail.com"]}'::jsonb
from auth.users
where lower(email) = lower('web3caleb@gmail.com');

-- Verification after commit.
select 'profiles' as table_name, count(*)::int as rows from public.profiles
union all select 'auth_users', count(*)::int from auth.users
union all select 'wallet_accounts', count(*)::int from public.wallet_accounts
union all select 'wallet_ledger', count(*)::int from public.wallet_ledger
union all select 'deposits', count(*)::int from public.deposits
union all select 'orders', count(*)::int from public.orders
union all select 'proxy_allocations', count(*)::int from public.proxy_allocations
union all select 'proxy_inventory', count(*)::int from public.proxy_inventory
union all select 'referrals', count(*)::int from public.referrals
union all select 'ambassador_profiles', count(*)::int from public.ambassador_profiles
union all select 'ambassador_commissions', count(*)::int from public.ambassador_commissions
union all select 'ambassador_withdrawals', count(*)::int from public.ambassador_withdrawals
union all select 'ambassador_ledger', count(*)::int from public.ambassador_ledger
union all select 'campaign_rewards', count(*)::int from public.campaign_rewards
union all select 'reward_payouts', count(*)::int from public.reward_payouts
union all select 'email_deliveries', count(*)::int from public.email_deliveries
union all select 'support_tickets', count(*)::int from public.support_tickets
union all select 'notifications', count(*)::int from public.notifications
union all select 'audit_logs', count(*)::int from public.audit_logs
union all select 'products', count(*)::int from public.products
union all select 'app_settings', count(*)::int from public.app_settings
union all select 'campaigns', count(*)::int from public.campaigns;

select p.id, p.email, p.role, p.status
from public.profiles p
order by p.role desc, p.email;
