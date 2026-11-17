create table if not exists public.proxy_expiry_reminders (
  allocation_id uuid primary key references public.proxy_allocations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  email_delivery_id uuid,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists proxy_expiry_reminders_user_idx
  on public.proxy_expiry_reminders (user_id, created_at desc);
alter table public.proxy_expiry_reminders enable row level security;

insert into public.app_settings (key, value, description) values
  ('proxy_expiry_reminder_hours', '24'::jsonb, 'Hours before proxy expiry to send the reminder email.'),
  ('proxy_expiry_reminder_enabled', 'true'::jsonb, 'Toggle proxy expiry reminder emails.')
on conflict (key) do nothing;
