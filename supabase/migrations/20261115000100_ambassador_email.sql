-- Ambassador commissions are denominated in USD cents and kept completely
-- separate from the NGN BUYBIZ wallet. Email delivery is queued in the same
-- database so a provider outage never loses a notification.

alter table public.referrals
  add column if not exists ambassador_qualified_at timestamptz;
alter table public.referrals
  add column if not exists ambassador_event_type text;
alter table public.referrals
  add column if not exists ambassador_event_ref text;

create table if not exists public.ambassador_profiles (
  user_id uuid primary key references public.profiles (id) on delete restrict,
  promoted_at timestamptz not null default now(),
  qualified_referrals_at_promotion integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.ambassador_commissions (
  id uuid primary key default gen_random_uuid(),
  ambassador_id uuid not null references public.profiles (id) on delete restrict,
  referral_id uuid not null unique references public.referrals (id) on delete restrict,
  amount_usd_cents integer not null,
  status text not null default 'available',
  description text not null default 'Ambassador referral commission',
  created_at timestamptz not null default now(),
  constraint ambassador_commission_positive check (amount_usd_cents > 0),
  constraint ambassador_commission_status check (status in ('available', 'void'))
);

create index if not exists ambassador_commissions_user_idx
  on public.ambassador_commissions (ambassador_id, created_at desc);

create table if not exists public.ambassador_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  entry_type text not null,
  amount_usd_cents integer not null,
  reference text not null unique,
  referral_id uuid references public.referrals (id) on delete restrict,
  withdrawal_id uuid,
  description text not null default '',
  created_at timestamptz not null default now(),
  constraint ambassador_ledger_type check (
    entry_type in ('commission', 'withdrawal_reserve', 'withdrawal_release')
  ),
  constraint ambassador_ledger_sign check (
    (entry_type = 'commission' and amount_usd_cents > 0)
    or (entry_type = 'withdrawal_reserve' and amount_usd_cents < 0)
    or (entry_type = 'withdrawal_release' and amount_usd_cents > 0)
  )
);

create index if not exists ambassador_ledger_user_idx
  on public.ambassador_ledger (user_id, created_at desc);

create table if not exists public.ambassador_wallet_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  address text not null,
  network text not null default 'BEP20',
  status text not null default 'pending',
  verified_by uuid references public.profiles (id) on delete set null,
  verified_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ambassador_address_network check (network = 'BEP20'),
  constraint ambassador_address_status check (status in ('pending', 'verified', 'rejected')),
  constraint ambassador_address_format check (address ~ '^0x[0-9a-fA-F]{40}$')
);

create unique index if not exists ambassador_one_verified_address_idx
  on public.ambassador_wallet_addresses (user_id)
  where status = 'verified';
create index if not exists ambassador_address_user_idx
  on public.ambassador_wallet_addresses (user_id, created_at desc);

create table if not exists public.ambassador_withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  amount_usd_cents integer not null,
  status text not null default 'pending',
  wallet_address text not null,
  network text not null default 'BEP20',
  transaction_hash text,
  rejection_reason text,
  admin_note text,
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  rejected_at timestamptz,
  paid_at timestamptz,
  processed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ambassador_withdrawal_min check (amount_usd_cents >= 1000),
  constraint ambassador_withdrawal_network check (network = 'BEP20'),
  constraint ambassador_withdrawal_status check (status in ('pending', 'processing', 'paid', 'rejected')),
  constraint ambassador_withdrawal_address check (wallet_address ~ '^0x[0-9a-fA-F]{40}$')
);

create unique index if not exists ambassador_one_open_withdrawal_idx
  on public.ambassador_withdrawals (user_id)
  where status in ('pending', 'processing');
create index if not exists ambassador_withdrawals_status_idx
  on public.ambassador_withdrawals (status, requested_at desc);

create table if not exists public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  recipient text not null,
  email_type text not null,
  dedupe_key text not null unique,
  subject text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  attempts integer not null default 0,
  last_error text,
  provider_message_id text,
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_delivery_status check (
    status in ('queued', 'sending', 'sent', 'failed', 'not_configured', 'disabled')
  ),
  constraint email_delivery_attempts check (attempts >= 0),
  constraint email_delivery_recipient check (position('@' in recipient) > 1)
);

create index if not exists email_deliveries_queue_idx
  on public.email_deliveries (status, scheduled_at);
create index if not exists email_deliveries_user_idx
  on public.email_deliveries (user_id, created_at desc);

create table if not exists public.email_otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  email text not null,
  purpose text not null default 'signup',
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  last_sent_at timestamptz not null default now(),
  constraint email_otp_attempts check (attempts >= 0),
  constraint email_otp_purpose check (purpose in ('signup', 'email_change'))
);

create index if not exists email_otps_email_idx
  on public.email_otps (lower(email), purpose, created_at desc);
create index if not exists email_otps_open_idx
  on public.email_otps (expires_at)
  where consumed_at is null;

create table if not exists public.email_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  marketing_opt_in boolean not null default false,
  deposit_reminders_opt_in boolean not null default true,
  unsubscribe_token text not null unique,
  updated_at timestamptz not null default now()
);

create table if not exists public.email_templates (
  type text primary key,
  subject text not null,
  preheader text not null default '',
  intro text not null default '',
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  message text not null,
  status text not null default 'draft',
  audience text not null default 'marketing_opt_in',
  created_by uuid references public.profiles (id) on delete set null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint email_campaign_status check (status in ('draft', 'sending', 'sent', 'cancelled')),
  constraint email_campaign_audience check (audience in ('marketing_opt_in', 'all_customers'))
);

alter table public.ambassador_profiles enable row level security;
alter table public.ambassador_commissions enable row level security;
alter table public.ambassador_ledger enable row level security;
alter table public.ambassador_wallet_addresses enable row level security;
alter table public.ambassador_withdrawals enable row level security;
alter table public.email_deliveries enable row level security;
alter table public.email_otps enable row level security;
alter table public.email_preferences enable row level security;
alter table public.email_templates enable row level security;
alter table public.email_campaigns enable row level security;

insert into public.app_settings (key, value, description) values
  ('ambassador_enabled', 'true'::jsonb, 'Enable automatic Ambassador promotion and commissions.'),
  ('ambassador_referrals_required', '10'::jsonb, 'Qualified referrals required for automatic Ambassador promotion.'),
  ('ambassador_commission_usd_cents', '300'::jsonb, 'USD commission per qualifying referral, in cents ($3 = 300).'),
  ('ambassador_withdrawal_min_usd_cents', '1000'::jsonb, 'Minimum ambassador USDT payout, in cents ($10 = 1000).'),
  ('ambassador_qualifying_task', '"referral_deposit"'::jsonb, 'Qualifying task: referral_deposit or referral_first_purchase.'),
  ('ambassador_qualifying_deposit_minor', '300000'::jsonb, 'Deposit amount that qualifies an ambassador referral, in kobo.'),
  ('email_sender_name', '"BUYBIZ"'::jsonb, 'Display name used on automated BUYBIZ emails.'),
  ('email_sender_email', '""'::jsonb, 'Verified sender address. The provider environment can also supply this.'),
  ('email_support_email', '""'::jsonb, 'Reply-to / support address shown in automated emails.'),
  ('email_followup_hours', '[24,72,168]'::jsonb, 'Hours after signup for deposit follow-up emails.'),
  ('email_marketing_enabled', 'false'::jsonb, 'Master switch for optional marketing campaigns.'),
  ('email_otp_ttl_minutes', '10'::jsonb, 'Signup OTP lifetime in minutes.'),
  ('email_otp_resend_seconds', '60'::jsonb, 'Minimum seconds between OTP sends.')
on conflict (key) do nothing;

insert into public.email_templates (type, subject, preheader, intro, enabled) values
  ('signup_verification', 'Your BUYBIZ verification code', 'Use this code to verify your email.', 'Enter this code to verify your email and finish setting up your BUYBIZ account.', true),
  ('welcome', 'Welcome to BUYBIZ', 'Your account is verified. Here is what happens next.', 'We are glad you are here. BUYBIZ gives you a simple way to buy the proxy access you need, with clear prices and real support.', true),
  ('deposit_confirmation', 'Your BUYBIZ wallet is funded', 'Your deposit has been verified.', 'Your payment has been verified and added to your BUYBIZ wallet. Here are the details.', true),
  ('referral_joined', 'Someone joined BUYBIZ with your link', 'Your referral has been recorded.', 'Good news: someone signed up with your referral link. Their progress is now visible in your referral dashboard.', true),
  ('referral_qualified', 'Your referral made a qualifying deposit', 'Your friend has met the referral requirement.', 'Your friend has completed the qualifying deposit. We are checking and crediting your referral reward now.', true),
  ('referral_reward', 'Your referral reward is in', '1,000 wallet credits have been added.', 'Your referral reward has landed in your BUYBIZ wallet. Thank you for sharing BUYBIZ with someone you know.', true),
  ('ambassador_promotion', 'You are now a BUYBIZ Ambassador', 'Your referral work has unlocked Ambassador status.', 'You have qualified for the BUYBIZ Ambassador Programme. Your separate USD earnings balance is now active.', true),
  ('ambassador_commission', 'You earned an ambassador commission', 'A referral completed the qualifying task.', 'A referral has completed the ambassador qualifying task, and your commission has been added to your USD balance.', true),
  ('payout_requested', 'We received your payout request', 'Your USDT payout is queued for review.', 'Your payout request is in. We will review it and keep you updated as the status changes.', true),
  ('payout_approved', 'Your payout is being processed', 'Your USDT payout was approved.', 'Your payout has been approved. We are preparing the USDT transfer to your BEP20 address.', true),
  ('payout_rejected', 'Your payout request needs attention', 'Your payout was not approved this time.', 'We could not approve this payout request. Your reserved amount has been returned to your available ambassador balance.', true),
  ('payout_paid', 'Your USDT payout has been sent', 'The transfer has been completed.', 'Your ambassador payout has been sent. The transaction hash is included below for your records.', true),
  ('deposit_followup', 'Ready to try BUYBIZ?', 'Your account is set up. Your first deposit is the next step.', 'You are all set up. When you are ready, add at least ₦3,000 to your wallet and choose the proxy plan that fits your work.', true),
  ('marketing', 'A little something from BUYBIZ', 'A BUYBIZ update for you.', 'Here is what is happening at BUYBIZ.', true)
on conflict (type) do update set
  subject = excluded.subject,
  preheader = excluded.preheader,
  intro = excluded.intro;

-- Every customer gets preferences, but marketing is opt-in and off by default.
insert into public.email_preferences (user_id, marketing_opt_in, deposit_reminders_opt_in, unsubscribe_token)
select p.id, false, true, replace(gen_random_uuid()::text, '-', '')
  from public.profiles p
 where p.role = 'customer'
on conflict (user_id) do nothing;
