insert into public.app_settings (key,value,description) values
 ('bybit_referral_url','""'::jsonb,'Official Bybit referral link. Leave blank until verified by the owner.'),
 ('bybit_referral_title','"Bybit referral campaign"'::jsonb,'Bybit promotion title.'),
 ('bybit_referral_terms','""'::jsonb,'Verified Bybit campaign terms.')
on conflict (key) do nothing;
