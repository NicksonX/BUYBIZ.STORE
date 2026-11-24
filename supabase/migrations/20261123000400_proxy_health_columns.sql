alter table public.proxy_inventory
  add column if not exists health_status text not null default 'unknown',
  add column if not exists consecutive_failures integer not null default 0,
  add column if not exists last_health_check_at timestamptz,
  add column if not exists last_health_success_at timestamptz,
  add column if not exists last_health_error text;
alter table public.proxy_inventory drop constraint if exists proxy_inventory_health_status_check;
alter table public.proxy_inventory add constraint proxy_inventory_health_status_check check (health_status in ('healthy','degraded','offline','auth_failure','unknown'));
insert into public.app_settings (key,value,description) values
 ('proxy_monitoring_enabled','true'::jsonb,'Background proxy health monitoring switch.'),
 ('proxy_failure_threshold','2'::jsonb,'Consecutive failed health checks before an outage alert.'),
 ('proxy_alert_reminder_hours','6'::jsonb,'Minimum hours between repeated proxy outage alerts.')
on conflict (key) do nothing;
