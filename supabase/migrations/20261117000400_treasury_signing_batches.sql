create table if not exists public.treasury_wallets (
  id uuid primary key default gen_random_uuid(),
  label text not null default 'BUYBIZ Treasury',
  asset text not null default 'USDT',
  network text not null default 'BEP20',
  address text not null unique,
  custody_mode text not null default 'external_hardware_wallet',
  owner_attested_at timestamptz,
  enabled boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.treasury_wallets enable row level security;

create table if not exists public.giveaway_payment_batches (
  id uuid primary key default gen_random_uuid(),
  giveaway_id uuid not null references public.giveaways(id) on delete restrict,
  status text not null default 'prepared' check (status in ('prepared','approved','awaiting_signature','partially_paid','paid','failed')),
  total_amount_usd_cents integer not null,
  item_count integer not null,
  prepared_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.giveaway_payment_batches enable row level security;

create table if not exists public.giveaway_payment_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.giveaway_payment_batches(id) on delete cascade,
  claim_id uuid not null unique references public.giveaway_claims(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  wallet_address text not null,
  amount_usd_cents integer not null,
  status text not null default 'pending' check (status in ('pending','awaiting_signature','broadcast','confirmed','failed')),
  transaction_hash text unique,
  recorded_at timestamptz not null default now(),
  confirmed_at timestamptz
);
alter table public.giveaway_payment_items enable row level security;

create table if not exists public.ai_admin_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  command text not null,
  mode text not null default 'deterministic',
  response text,
  created_at timestamptz not null default now()
);
alter table public.ai_admin_actions enable row level security;

insert into public.app_settings (key,value,description) values
  ('gemini_model', '"gemini-2.0-flash"'::jsonb, 'Optional Gemini model for the admin command centre.'),
  ('giveaway_payment_enabled', 'false'::jsonb, 'Owner switch for giveaway payment batch execution.')
on conflict (key) do nothing;
