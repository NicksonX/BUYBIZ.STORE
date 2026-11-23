create table if not exists public.proxy_allocation_flags (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid not null unique references public.proxy_allocations(id) on delete cascade,
  reason text not null default 'November 16 7-day proxy tracking',
  flagged_by uuid references public.profiles(id) on delete set null,
  flagged_at timestamptz not null default now()
);
create index if not exists proxy_allocation_flags_flagged_idx on public.proxy_allocation_flags (flagged_at desc);
alter table public.proxy_allocation_flags enable row level security;

alter table public.proxy_switches add column if not exists actor_admin_id uuid references public.profiles(id) on delete set null;
alter table public.proxy_switches add column if not exists reason text;
alter table public.proxy_switches add column if not exists from_status text;
alter table public.proxy_switches add column if not exists to_status text;
alter table public.proxy_switches add column if not exists previous_expires_at timestamptz;
alter table public.proxy_switches add column if not exists new_expires_at timestamptz;
create index if not exists proxy_switches_admin_idx on public.proxy_switches (actor_admin_id, switched_at desc);
