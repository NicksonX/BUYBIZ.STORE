-- Raise the shared-proxy seat cap from 20 to 30.
alter table public.proxy_inventory
  drop constraint if exists proxy_shared_max_twenty;
alter table public.proxy_inventory
  add constraint proxy_shared_max_thirty
  check (access_type <> 'shared' or max_seats <= 30);
