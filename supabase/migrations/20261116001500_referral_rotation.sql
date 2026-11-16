-- Normal buyer referral: $3 USD, Ambassador unlock at two valid referrals.
insert into public.app_settings (key, value, description) values
  ('ambassador_referrals_required', '2'::jsonb, 'Valid referrals required to unlock Ambassador status.'),
  ('ambassador_qualifying_task', '"referral_first_purchase"'::jsonb, 'Referral rewards require a successful proxy purchase.'),
  ('ambassador_qualifying_deposit_minor', '0'::jsonb, 'Deprecated: no fixed deposit threshold for referral rewards.'),
  ('referral_reward_usd_cents', '300'::jsonb, 'Normal referral reward in USD cents.')
on conflict (key) do update set value = excluded.value, updated_at = now();

-- Sequential inventory rotation pointer per eligible group.
alter table public.proxy_inventory
  add column if not exists last_assigned_at timestamptz;
create index if not exists proxy_inventory_rotation_idx
  on public.proxy_inventory (country_code, access_type, product_slug, last_assigned_at, uploaded_at);
