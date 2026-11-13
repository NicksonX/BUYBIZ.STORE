-- Meaningful customer activity is recorded explicitly by authentication and
-- financial actions. Background reads and refreshes never update this value.

alter table public.profiles
  add column if not exists last_activity_at timestamptz;
alter table public.profiles
  add column if not exists frozen_at timestamptz;
alter table public.profiles
  add column if not exists freeze_reason text;
alter table public.profiles
  add column if not exists last_reactivated_at timestamptz;

update public.profiles
   set last_activity_at = coalesce(created_at, now())
 where last_activity_at is null;

alter table public.profiles
  alter column last_activity_at set default now();
alter table public.profiles
  alter column last_activity_at set not null;

create index if not exists profiles_last_activity_idx
  on public.profiles (last_activity_at)
  where role = 'customer' and status = 'active';

create table if not exists public.account_freezes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  reason text not null default 'inactivity',
  last_activity_at timestamptz not null,
  frozen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists account_freezes_user_idx
  on public.account_freezes (user_id, frozen_at desc);

create table if not exists public.account_reactivations (
  id uuid primary key default gen_random_uuid(),
  freeze_id uuid not null unique references public.account_freezes (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete restrict,
  method text not null check (method in ('wallet', 'admin')),
  fee_minor bigint not null default 0,
  reactivated_by uuid references public.profiles (id) on delete set null,
  notes text,
  reactivated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint reactivation_fee_non_negative check (fee_minor >= 0)
);

create index if not exists account_reactivations_user_idx
  on public.account_reactivations (user_id, reactivated_at desc);

insert into public.app_settings (key, value, description) values
  ('inactivity_days', '60'::jsonb, 'Consecutive days without meaningful customer activity before an account is frozen.'),
  ('reactivation_fee_minor', '100000'::jsonb, 'Wallet fee charged when a frozen customer self-reactivates, in kobo.'),
  ('admin_notification_email', '""'::jsonb, 'Administrator reminder email. Empty means email delivery is not configured.'),
  ('admin_notification_phone', '""'::jsonb, 'Optional administrator SMS number. Empty means SMS is not configured.'),
  ('admin_voice_phone', '""'::jsonb, 'Optional administrator voice-call number. Empty means voice calls are not configured.'),
  ('admin_notification_channels', '["in_app"]'::jsonb, 'Enabled administrator reminder channels. In-app is always available; external channels require a configured provider.'),
  ('admin_reminder_time', '"08:00"'::jsonb, 'Preferred local reminder time for administrator digests.'),
  ('admin_timezone', '"Africa/Lagos"'::jsonb, 'Timezone used for administrator reminder scheduling.')
on conflict (key) do nothing;

update public.profiles
   set onboarding_completed_at = coalesce(onboarding_completed_at, created_at, now())
 where onboarding_complete = true;
