-- Immutable records for customer proxy terminations and switches.

create table if not exists public.proxy_terminations (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid not null unique
    references public.proxy_allocations (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete restrict,
  order_id uuid not null references public.orders (id) on delete restrict,
  product_id uuid not null references public.products (id) on delete restrict,
  proxy_inventory_id uuid not null references public.proxy_inventory (id) on delete restrict,
  amount_paid_minor bigint not null,
  duration_seconds integer not null,
  days_used integer not null,
  used_minor bigint not null,
  refund_minor bigint not null,
  reason text not null default 'customer_terminated',
  terminated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint termination_amount_paid_non_negative check (amount_paid_minor >= 0),
  constraint termination_days_non_negative check (days_used >= 0),
  constraint termination_used_non_negative check (used_minor >= 0),
  constraint termination_refund_non_negative check (refund_minor >= 0),
  constraint termination_refund_within_purchase check (
    refund_minor + used_minor = amount_paid_minor
  )
);

create index if not exists proxy_terminations_user_idx
  on public.proxy_terminations (user_id, terminated_at desc);
create index if not exists proxy_terminations_allocation_idx
  on public.proxy_terminations (allocation_id);

create table if not exists public.proxy_switches (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid not null
    references public.proxy_allocations (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete restrict,
  from_inventory_id uuid not null
    references public.proxy_inventory (id) on delete restrict,
  to_inventory_id uuid not null
    references public.proxy_inventory (id) on delete restrict,
  switched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint switch_changes_inventory check (from_inventory_id <> to_inventory_id)
);

create index if not exists proxy_switches_allocation_idx
  on public.proxy_switches (allocation_id, switched_at desc);
create index if not exists proxy_switches_user_idx
  on public.proxy_switches (user_id, switched_at desc);
