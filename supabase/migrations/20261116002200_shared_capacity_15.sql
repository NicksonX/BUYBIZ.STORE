alter table public.proxy_inventory
  drop constraint if exists proxy_shared_max_ten;

alter table public.proxy_inventory
  add constraint proxy_shared_max_fifteen
  check (access_type <> 'shared' or max_seats <= 15);

insert into public.app_settings (key, value, description) values
  ('deposit_scheduled_min_minor', '300000'::jsonb, 'Scheduled minimum deposit in kobo.'),
  ('deposit_scheduled_at', '"2026-11-20T00:00:00+01:00"'::jsonb, 'When the scheduled minimum activates (Africa/Lagos).')
on conflict (key) do nothing;

update public.app_settings set value = to_jsonb(15), updated_at = now()
 where key = 'inventory_default_max_seats' and (value #>> '{}')::int < 15;

update public.proxy_inventory
   set max_seats = 15, updated_at = now()
 where access_type = 'shared'
   and archived_at is null
   and max_seats < 15;
