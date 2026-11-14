-- BUYBIZ referral campaign and USD reward ledgers.
-- Campaign rewards are deliberately separate from both the NGN wallet ledger
-- and the Ambassador USD ledger. All values are integer USD cents.

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  status text not null default 'draft',
  customer_reward_usd_cents integer not null default 1000,
  referrer_reward_usd_cents integer not null default 1000,
  qualifying_deposit_minor bigint not null default 300000,
  eligible_product_slugs jsonb not null default '[]'::jsonb,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  payout_at timestamptz not null,
  timezone text not null default 'Africa/Lagos',
  terms text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaign_status_check check (status in ('draft', 'published', 'paused')),
  constraint campaign_window_check check (ends_at > starts_at),
  constraint campaign_payout_after_end_check check (payout_at >= ends_at),
  constraint campaign_customer_reward_positive check (customer_reward_usd_cents > 0),
  constraint campaign_referrer_reward_non_negative check (referrer_reward_usd_cents >= 0),
  constraint campaign_deposit_non_negative check (qualifying_deposit_minor >= 0)
);

create index if not exists campaigns_status_window_idx
  on public.campaigns (status, starts_at, ends_at);
create index if not exists campaigns_published_idx
  on public.campaigns (published_at desc)
  where status = 'published';

drop trigger if exists campaigns_touch_updated_at on public.campaigns;
create trigger campaigns_touch_updated_at
before update on public.campaigns
for each row execute function public.touch_updated_at();

create table if not exists public.campaign_rewards (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete restrict,
  customer_id uuid not null references public.profiles (id) on delete restrict,
  referrer_id uuid references public.profiles (id) on delete restrict,
  beneficiary_id uuid not null references public.profiles (id) on delete restrict,
  role text not null,
  amount_usd_cents integer not null,
  status text not null default 'pending',
  qualifying_deposit_id uuid not null references public.deposits (id) on delete restrict,
  qualifying_order_id uuid not null references public.orders (id) on delete restrict,
  referral_id uuid references public.referrals (id) on delete restrict,
  available_at timestamptz not null,
  earned_at timestamptz not null default now(),
  paid_at timestamptz,
  rejection_reason text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaign_reward_role_check check (role in ('customer', 'referrer')),
  constraint campaign_reward_amount_positive check (amount_usd_cents > 0),
  constraint campaign_reward_status_check check (status in ('pending', 'available', 'reserved', 'paid', 'rejected', 'void')),
  constraint campaign_customer_beneficiary_check check (
    role <> 'customer' or (beneficiary_id = customer_id)
  ),
  constraint campaign_referrer_beneficiary_check check (
    role <> 'referrer' or (referrer_id is not null and beneficiary_id = referrer_id)
  ),
  constraint campaign_referrer_distinct_check check (
    referrer_id is null or referrer_id <> customer_id
  ),
  constraint campaign_one_reward_per_role unique (campaign_id, customer_id, role)
);

create unique index if not exists campaign_rewards_referral_role_idx
  on public.campaign_rewards (campaign_id, referral_id, role)
  where referral_id is not null;
create index if not exists campaign_rewards_customer_idx
  on public.campaign_rewards (customer_id, created_at desc);
create index if not exists campaign_rewards_beneficiary_idx
  on public.campaign_rewards (beneficiary_id, created_at desc);
create index if not exists campaign_rewards_campaign_idx
  on public.campaign_rewards (campaign_id, role, status);

drop trigger if exists campaign_rewards_touch_updated_at on public.campaign_rewards;
create trigger campaign_rewards_touch_updated_at
before update on public.campaign_rewards
for each row execute function public.touch_updated_at();

create table if not exists public.reward_payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  amount_usd_cents integer not null,
  status text not null default 'pending_review',
  wallet_address text not null,
  network text not null default 'BEP20',
  transaction_hash text,
  rejection_reason text,
  admin_note text,
  requested_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reward_payout_amount_positive check (amount_usd_cents > 0),
  constraint reward_payout_network_check check (network = 'BEP20'),
  constraint reward_payout_address_check check (wallet_address ~ '^0x[0-9a-fA-F]{40}$'),
  constraint reward_payout_status_check check (status in ('pending_review', 'approved', 'processing', 'paid', 'rejected')),
  constraint reward_payout_hash_check check (transaction_hash is null or transaction_hash ~ '^0x[0-9a-fA-F]{64}$')
);

create unique index if not exists reward_payouts_one_open_idx
  on public.reward_payouts (user_id)
  where status in ('pending_review', 'approved', 'processing');
create index if not exists reward_payouts_status_idx
  on public.reward_payouts (status, requested_at desc);

drop trigger if exists reward_payouts_touch_updated_at on public.reward_payouts;
create trigger reward_payouts_touch_updated_at
before update on public.reward_payouts
for each row execute function public.touch_updated_at();

create table if not exists public.reward_payout_items (
  payout_id uuid not null references public.reward_payouts (id) on delete restrict,
  reward_id uuid not null unique references public.campaign_rewards (id) on delete restrict,
  amount_usd_cents integer not null,
  created_at timestamptz not null default now(),
  primary key (payout_id, reward_id),
  constraint reward_payout_item_positive check (amount_usd_cents > 0)
);

create index if not exists reward_payout_items_payout_idx
  on public.reward_payout_items (payout_id);

insert into public.app_settings (key, value, description) values
  ('campaigns_enabled', 'true'::jsonb, 'Master switch for public campaign promotion and qualification.'),
  ('campaign_dual_reward_default_usd_cents', '1000'::jsonb, 'Default per-side campaign reward, in USD cents ($10 = 1000).')
on conflict (key) do nothing;

insert into public.campaigns (
  slug, name, description, status,
  customer_reward_usd_cents, referrer_reward_usd_cents,
  qualifying_deposit_minor, eligible_product_slugs,
  starts_at, ends_at, payout_at, timezone, terms,
  published_at
) values (
  'customer-referrer-10',
  'The $10 + $10 Referral Campaign',
  'When a new customer joins through a referral link, deposits at least ₦2,000 and makes an eligible purchase during the campaign, both the customer and their referrer earn $10 in USD rewards.',
  'published',
  1000, 1000, 200000, '[]'::jsonb,
  '2026-11-20 00:00:00+01'::timestamptz,
  '2026-12-23 23:59:59+01'::timestamptz,
  '2026-12-24 00:00:00+01'::timestamptz,
  'Africa/Lagos',
  'The qualifying deposit and eligible purchase must both occur during the campaign window. One customer reward per qualifying customer. One referrer reward per distinct qualifying customer. Self-referrals, failed, reversed, refunded or fraudulent transactions do not qualify. USD rewards are paid in USDT on BNB Smart Chain (BEP20) after manual review.',
  now()
)
on conflict (slug) do nothing;
