-- Customer termination is a distinct terminal state from an expired or
-- interrupted allocation.

alter type public.allocation_status add value if not exists 'terminated';

-- Shared upstream proxies are sold with at most ten active customer seats.
-- Personal inventory remains one seat. Existing inventory must satisfy this.
do $$ begin
  alter table public.proxy_inventory
    add constraint proxy_shared_max_ten
    check (access_type <> 'shared' or max_seats <= 10);
exception when duplicate_object then null; end $$;
