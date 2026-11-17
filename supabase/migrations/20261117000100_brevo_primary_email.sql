insert into public.app_settings (key, value, description) values
  ('email_primary_provider', '"brevo"'::jsonb, 'Authoritative primary transactional email provider.'),
  ('email_rotation_enabled', 'false'::jsonb, 'When false, use the primary provider with the other as fallback.')
on conflict (key) do update set value = excluded.value, updated_at = now();
