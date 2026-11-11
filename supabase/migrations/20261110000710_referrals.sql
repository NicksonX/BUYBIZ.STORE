-- Referral programme: every customer gets a shareable code. A referral only
-- qualifies after the referred customer has a single external deposit of at
-- least ₦3,000. Internal transfers, refunds and admin credits never qualify.

alter table public.wallet_ledger drop constraint if exists ledger_sign_matches_type;
alter table public.wallet_ledger add constraint ledger_sign_matches_type check (
  (entry_type in ('deposit_credit', 'refund_credit', 'admin_credit', 'transfer_credit', 'referral_credit') and amount_minor > 0)
  or (entry_type in ('purchase_debit', 'admin_debit', 'transfer_debit') and amount_minor < 0)
  or entry_type = 'reversal'
);

alter table public.profiles add column if not exists referral_code text;
update public.profiles
   set referral_code = 'BZ' || upper(substr(replace(id::text, '-', ''), 1, 8))
 where referral_code is null;
alter table public.profiles
  alter column referral_code set default (
    'BZ' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  );
alter table public.profiles alter column referral_code set not null;
create unique index if not exists profiles_referral_code_idx
  on public.profiles (upper(referral_code));

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles (id) on delete restrict,
  referee_id uuid not null unique references public.profiles (id) on delete restrict,
  referral_code text not null,
  status text not null default 'pending',
  qualifying_deposit_id uuid references public.deposits (id) on delete restrict,
  reward_amount_minor bigint,
  rewarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint referral_parties_differ check (referrer_id <> referee_id),
  constraint referral_status_check check (status in ('pending', 'rewarded', 'rejected')),
  constraint referral_reward_positive check (reward_amount_minor is null or reward_amount_minor > 0)
);

create index if not exists referrals_referrer_idx
  on public.referrals (referrer_id, created_at desc);
create index if not exists referrals_status_idx
  on public.referrals (status, created_at desc);

drop trigger if exists referrals_touch_updated_at on public.referrals;
create trigger referrals_touch_updated_at
before update on public.referrals
for each row execute function public.touch_updated_at();

insert into public.app_settings (key, value, description) values
  ('referral_enabled', 'true'::jsonb, 'Referral wallet rewards are enabled.'),
  ('referral_qualifying_deposit_minor', '300000'::jsonb, 'Single external deposit required to qualify, in kobo (₦3,000).'),
  ('referral_reward_minor', '100000'::jsonb, 'Referral wallet credit, in kobo (₦1,000).')
on conflict (key) do nothing;
