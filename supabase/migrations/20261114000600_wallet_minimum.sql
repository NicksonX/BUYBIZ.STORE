-- BUYBIZ credits are 1:1 with naira. The server enforces the minimum deposit.
update public.app_settings
   set value = '300000'::jsonb,
       updated_at = now()
 where key = 'deposit_min_minor';

insert into public.app_settings (key, value, description)
values ('deposit_min_minor', '300000'::jsonb, 'Minimum wallet deposit in kobo (₦3,000).')
on conflict (key) do update set value = excluded.value, updated_at = now();
