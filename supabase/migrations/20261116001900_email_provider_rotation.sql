-- Isolated email-provider infrastructure. No business tables are modified.
alter table public.email_deliveries
  add column if not exists provider text,
  add column if not exists provider_status text,
  add column if not exists provider_selected_at timestamptz,
  add column if not exists provider_accepted_at timestamptz,
  add column if not exists fallback_used boolean not null default false;

create table if not exists public.email_provider_rotation (
  id smallint primary key default 1 check (id = 1),
  next_provider text not null default 'resend'
    check (next_provider in ('resend', 'brevo')),
  updated_at timestamptz not null default now()
);
insert into public.email_provider_rotation (id, next_provider)
values (1, 'resend') on conflict (id) do nothing;

create table if not exists public.email_provider_attempts (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.email_deliveries(id) on delete cascade,
  attempt_number integer not null check (attempt_number > 0),
  provider text not null check (provider in ('resend', 'brevo')),
  status text not null check (status in ('accepted', 'rejected', 'uncertain', 'skipped')),
  provider_message_id text,
  http_status integer,
  error_category text,
  error_message text,
  created_at timestamptz not null default now(),
  unique (delivery_id, attempt_number)
);
create index if not exists email_provider_attempts_delivery_idx
  on public.email_provider_attempts (delivery_id, created_at desc);

create table if not exists public.email_provider_usage (
  provider text not null check (provider in ('resend', 'brevo')),
  usage_date date not null,
  accepted_count integer not null default 0 check (accepted_count >= 0),
  primary key (provider, usage_date)
);

alter table public.email_provider_rotation enable row level security;
alter table public.email_provider_attempts enable row level security;
alter table public.email_provider_usage enable row level security;
