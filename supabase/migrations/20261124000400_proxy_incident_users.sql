create table if not exists public.proxy_health_incident_users (
  incident_id uuid not null references public.proxy_health_incidents(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  notified_at timestamptz not null default now(),
  recovered_notified_at timestamptz,
  primary key (incident_id, user_id)
);
alter table public.proxy_health_incident_users enable row level security;
