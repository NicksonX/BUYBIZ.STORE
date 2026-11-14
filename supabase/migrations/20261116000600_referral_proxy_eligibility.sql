-- Unified referral/campaign eligibility: a completed proxy purchase of at
-- least the configured minimum duration (default 7 days), plus the existing
-- verified deposit threshold where applicable. Deposits alone never qualify.

insert into public.app_settings (key, value, description) values
  ('referral_qualifying_proxy_duration_seconds', '604800'::jsonb,
   'Minimum proxy subscription duration that unlocks referral and campaign rewards (seconds). Default 7 days.')
on conflict (key) do nothing;

alter table public.referrals
  add column if not exists qualifying_order_id uuid references public.orders (id) on delete restrict,
  add column if not exists qualifying_purchase_at timestamptz,
  add column if not exists qualifying_duration_seconds integer;

alter table public.referrals drop constraint if exists referral_status_check;
alter table public.referrals
  add constraint referral_status_check check (
    status in ('registered', 'pending', 'qualified', 'rewarded', 'rejected')
  );
alter table public.referrals alter column status set default 'registered';

-- Existing pending rows with no deposit are simply registered, not pending.
update public.referrals
   set status = 'registered'
 where status = 'pending'
   and qualifying_deposit_id is null;

alter table public.referrals drop constraint if exists referral_duration_positive;
alter table public.referrals
  add constraint referral_duration_positive check (
    qualifying_duration_seconds is null or qualifying_duration_seconds > 0
  );

create unique index if not exists referrals_qualifying_order_idx
  on public.referrals (qualifying_order_id)
  where qualifying_order_id is not null;

create unique index if not exists wallet_ledger_referral_reference_idx
  on public.wallet_ledger (reference)
  where entry_type = 'referral_credit';

update public.campaigns
   set description = 'When a new customer joins through a referral link, deposits at least ₦2,000 and completes a proxy purchase of 7 days or more during the campaign, both the customer and their referrer earn $10 in USD rewards.',
       terms = 'The qualifying deposit and the 7-day-or-longer proxy purchase must both occur during the campaign window. One customer reward per qualifying customer. One referrer reward per distinct qualifying customer. Self-referrals, failed, reversed, refunded or fraudulent transactions do not qualify. USD rewards are paid in USDT on BNB Smart Chain (BEP20) after manual review.',
       updated_at = now()
 where slug = 'customer-referrer-10';
