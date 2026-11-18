alter table public.support_messages
  add column if not exists edited_at timestamptz,
  add column if not exists edited_by uuid references public.profiles(id) on delete set null,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null;

alter table public.proxy_inventory
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null;

alter table public.profiles
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deletion_effective_at timestamptz;

create index if not exists proxy_inventory_deleted_idx on public.proxy_inventory (deleted_at);
