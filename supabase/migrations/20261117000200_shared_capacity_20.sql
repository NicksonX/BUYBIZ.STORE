alter table public.proxy_inventory
  drop constraint if exists proxy_shared_max_fifteen;

alter table public.proxy_inventory
  add constraint proxy_shared_max_twenty
  check (access_type <> 'shared' or max_seats <= 20);

update public.app_settings set value = to_jsonb(20), updated_at = now()
 where key = 'inventory_default_max_seats' and (value #>> '{}')::int < 20;

update public.proxy_inventory
   set max_seats = 20, updated_at = now()
 where access_type = 'shared'
   and archived_at is null
   and max_seats < 20;
