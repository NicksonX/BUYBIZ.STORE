-- Inventory is tied to an exact package so 24-hour, 7-day, 30-day and personal
-- stock cannot be mixed. Credential groups let the owner create new stock for
-- new customers while an older cohort finishes its promised access window.

alter table public.proxy_inventory
  add column if not exists product_slug text;
alter table public.proxy_inventory
  add column if not exists credential_group text not null default 'A';
alter table public.proxy_inventory
  add column if not exists rotation_interval_hours integer;
alter table public.proxy_inventory
  add column if not exists last_rotated_at timestamptz;
alter table public.proxy_inventory
  add column if not exists next_rotation_at timestamptz;
alter table public.proxy_inventory
  add column if not exists credential_version integer not null default 1;

do $$ begin
  alter table public.proxy_inventory
    add constraint inventory_product_slug_fk
    foreign key (product_slug) references public.products (slug) on delete restrict;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.proxy_inventory
    add constraint inventory_rotation_interval_check
    check (rotation_interval_hours is null or rotation_interval_hours between 1 and 8760);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.proxy_inventory
    add constraint inventory_credential_version_positive
    check (credential_version > 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.proxy_inventory
    add constraint inventory_credential_group_present
    check (length(trim(credential_group)) between 1 and 24);
exception when duplicate_object then null; end $$;

create index if not exists inventory_product_slug_idx
  on public.proxy_inventory (product_slug, status, upstream_expires_at);
create index if not exists inventory_rotation_due_idx
  on public.proxy_inventory (next_rotation_at)
  where rotation_interval_hours is not null and archived_at is null;

create table if not exists public.proxy_rotations (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.proxy_inventory (id) on delete restrict,
  rotated_by uuid references public.profiles (id) on delete set null,
  rotated_at timestamptz not null default now(),
  previous_version integer not null,
  new_version integer not null,
  affected_active integer not null default 0,
  affected_expired integer not null default 0,
  affected_unexpired integer not null default 0,
  status text not null default 'completed' check (status in ('completed', 'blocked')),
  notes text,
  created_at timestamptz not null default now(),
  constraint rotation_versions_increase check (new_version > previous_version)
);

create index if not exists proxy_rotations_inventory_idx
  on public.proxy_rotations (inventory_id, rotated_at desc);
create index if not exists proxy_rotations_admin_idx
  on public.proxy_rotations (rotated_by, rotated_at desc);

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  title text not null,
  body text not null default '',
  action_url text,
  related_inventory_id uuid references public.proxy_inventory (id) on delete set null,
  related_user_id uuid references public.profiles (id) on delete set null,
  dedupe_key text not null unique,
  read_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists admin_notifications_unread_idx
  on public.admin_notifications (read_at, created_at desc);
create index if not exists admin_notifications_type_idx
  on public.admin_notifications (type, created_at desc);

alter table public.account_freezes enable row level security;
alter table public.account_reactivations enable row level security;
alter table public.proxy_rotations enable row level security;
alter table public.admin_notifications enable row level security;

insert into public.app_settings (key, value, description) values
  ('rotation_reminder_hours_24', '24'::jsonb, 'Reminder interval for 24-hour proxy credential rotation.'),
  ('rotation_reminder_hours_7d', '168'::jsonb, 'Reminder interval for 7-day proxy credential rotation.'),
  ('inventory_expiry_warning_days', '7'::jsonb, 'Administrator warning window before upstream inventory expiry.'),
  ('inactivity_warning_days', '7'::jsonb, 'Days before the inactivity freeze when the admin receives a warning.')
on conflict (key) do nothing;
