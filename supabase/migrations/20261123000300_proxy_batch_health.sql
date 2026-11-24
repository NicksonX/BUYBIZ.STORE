alter table public.proxy_allocations add column if not exists credential_group text;
update public.proxy_allocations a set credential_group=i.credential_group
  from public.proxy_inventory i where i.id=a.proxy_inventory_id and a.credential_group is null;
create index if not exists proxy_allocations_credential_group_idx on public.proxy_allocations (credential_group);
create table if not exists public.proxy_health_incidents (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.proxy_inventory(id) on delete restrict,
  credential_group text not null,
  incident_type text not null check (incident_type in ('proxy_offline','proxy_degraded','proxy_auth_failure','batch_incident')),
  status text not null default 'open' check (status in ('open','recovered')),
  first_detected_at timestamptz not null default now(),
  last_failure_at timestamptz not null default now(),
  recovered_at timestamptz,
  consecutive_failures integer not null default 0,
  latency_ms integer,
  diagnostic text,
  alert_status text not null default 'pending',
  alert_sent_at timestamptz,
  resolved_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (inventory_id, status)
);
create index if not exists proxy_health_incidents_group_idx on public.proxy_health_incidents (credential_group, status, first_detected_at desc);
alter table public.proxy_health_incidents enable row level security;
