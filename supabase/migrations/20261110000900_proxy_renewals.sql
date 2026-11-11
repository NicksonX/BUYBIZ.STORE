-- Manual proxy renewals. There is no auto-renewal. A renewal extends an active
-- allocation from its current expiry after a fresh wallet debit.

create table if not exists public.proxy_renewals (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid not null references public.proxy_allocations (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete restrict,
  order_id uuid not null unique references public.orders (id) on delete restrict,
  product_id uuid not null references public.products (id) on delete restrict,
  previous_expires_at timestamptz not null,
  new_expires_at timestamptz not null,
  amount_minor bigint not null,
  created_at timestamptz not null default now(),
  constraint renewal_amount_positive check (amount_minor > 0),
  constraint renewal_extends_expiry check (new_expires_at > previous_expires_at)
);

create index if not exists proxy_renewals_allocation_idx
  on public.proxy_renewals (allocation_id, created_at desc);
create index if not exists proxy_renewals_user_idx
  on public.proxy_renewals (user_id, created_at desc);
