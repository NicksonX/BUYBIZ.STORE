create table if not exists public.giveaways (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  reward_amount_usd_cents integer not null check (reward_amount_usd_cents > 0),
  reward_asset text not null default 'USDT',
  network text not null default 'BEP20',
  claim_limit integer not null default 20 check (claim_limit > 0),
  claimed_count integer not null default 0 check (claimed_count >= 0),
  code_hash text not null,
  code_encrypted text not null,
  status text not null default 'draft' check (status in ('draft','scheduled','active','paused','ended','claimed')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint giveaway_claimed_within_limit check (claimed_count <= claim_limit)
);
create index if not exists giveaways_status_idx on public.giveaways(status, starts_at);
alter table public.giveaways enable row level security;

create table if not exists public.giveaway_claims (
  id uuid primary key default gen_random_uuid(),
  giveaway_id uuid not null references public.giveaways(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  reward_amount_usd_cents integer not null,
  wallet_address text,
  address_status text not null default 'missing' check (address_status in ('missing','submitted','verified')),
  payment_status text not null default 'pending' check (payment_status in ('pending','approved','processing','paid','failed')),
  transaction_hash text,
  claimed_at timestamptz not null default now(),
  paid_at timestamptz,
  unique (giveaway_id, user_id)
);
create index if not exists giveaway_claims_giveaway_idx on public.giveaway_claims(giveaway_id, claimed_at);
alter table public.giveaway_claims enable row level security;

create table if not exists public.giveaway_claim_attempts (
  id uuid primary key default gen_random_uuid(),
  giveaway_id uuid not null references public.giveaways(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  result text not null,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists giveaway_attempts_idx on public.giveaway_claim_attempts(giveaway_id, created_at desc);
alter table public.giveaway_claim_attempts enable row level security;

create table if not exists public.treasury_accounts (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  asset text not null,
  network text not null,
  address text not null,
  status text not null default 'active' check (status in ('active','disabled')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (asset, network, address)
);
alter table public.treasury_accounts enable row level security;

create table if not exists public.treasury_transactions (
  id uuid primary key default gen_random_uuid(),
  treasury_account_id uuid not null references public.treasury_accounts(id) on delete restrict,
  direction text not null check (direction in ('in','out')),
  amount text not null,
  asset text not null,
  network text not null,
  status text not null default 'pending' check (status in ('pending','confirmed','failed')),
  transaction_hash text not null unique,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);
alter table public.treasury_transactions enable row level security;
