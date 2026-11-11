-- Single-customer proxy access and the ₦5,000 personal monthly plan.

alter table public.products
  add column if not exists access_type text not null default 'shared';
alter table public.products
  add column if not exists max_active_per_customer integer;

do $$ begin
  alter table public.products
    add constraint products_access_type_check
    check (access_type in ('shared', 'single'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.products
    add constraint products_max_active_check
    check (max_active_per_customer is null or max_active_per_customer > 0);
exception when duplicate_object then null; end $$;

alter table public.proxy_inventory
  add column if not exists access_type text not null default 'shared';

do $$ begin
  alter table public.proxy_inventory
    add constraint inventory_access_type_check
    check (access_type in ('shared', 'single'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.proxy_inventory
    add constraint single_access_one_seat
    check (access_type <> 'single' or max_seats = 1);
exception when duplicate_object then null; end $$;

-- Remove the customer-facing seat count from existing live catalogue copy.
update public.products
   set features = '["Instant allocation", "Shared upstream proxy", "Connection details in your dashboard"]'::jsonb
 where slug = 'proxy-24-hours';
update public.products
   set features = '["Instant allocation", "Shared upstream proxy", "Expires exactly 7 days after activation"]'::jsonb
 where slug = 'proxy-7-days';
update public.products
   set features = '["Instant allocation", "Shared upstream proxy", "Expires exactly 30 days after activation"]'::jsonb
 where slug = 'proxy-30-days';

insert into public.products
  (slug, name, description, category, duration_seconds, price_minor, currency,
   is_active, is_coming_soon, features, sort_order, access_type, max_active_per_customer)
values (
  'proxy-personal-30-days',
  'Personal 30-Day Proxy',
  'One active customer per proxy for 30 days. Your credentials are not shared with other BUYBIZ customers.',
  'proxy',
  2592000,
  500000,
  'NGN',
  true,
  false,
  '["One active customer per proxy", "Credentials not shared with other customers", "Expires exactly 30 days after activation"]'::jsonb,
  35,
  'single',
  1
)
on conflict (slug) do nothing;
