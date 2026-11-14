-- Policy update: wallet top-ups start at ₦1,500, while every referral/campaign
-- qualification requires a single verified external deposit of at least ₦2,000.
-- The existing ₦1,000 referral wallet reward is unchanged.

update public.app_settings
   set value = '150000'::jsonb, updated_at = now()
 where key = 'deposit_min_minor';

update public.app_settings
   set value = '200000'::jsonb, updated_at = now()
 where key in ('referral_qualifying_deposit_minor', 'ambassador_qualifying_deposit_minor');

update public.campaigns
   set qualifying_deposit_minor = 200000,
       description = replace(description, '₦3,000', '₦2,000'),
       updated_at = now()
 where slug = 'customer-referrer-10';

insert into public.app_settings (key, value, description)
values
  ('ambassador_next_payout_at', '"2026-12-20T00:00:00+01:00"'::jsonb, 'Target date for the next $3 Ambassador payout batch (Africa/Lagos).')
on conflict (key) do nothing;
