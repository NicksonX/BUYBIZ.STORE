-- ============================================================================
-- BUYBIZ core schema
-- Portable PostgreSQL schema used by both Supabase (production) and the
-- embedded PGlite database used for local demo/testing.
--
-- Money is stored in integer minor units (kobo). ₦1 = 100 kobo.
-- All timestamps are timestamptz (UTC).
-- This migration is intentionally free of Supabase-specific objects so that
-- it can also run in PGlite. See 20261110000200_auth_and_roles.sql for auth
-- triggers and 20261110000300_rls.sql for row level security.
-- ============================================================================



-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('customer', 'support', 'admin', 'super_admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.account_status as enum ('active', 'suspended', 'pending_verification');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.proxy_protocol as enum ('http', 'https', 'socks4', 'socks5');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.proxy_status as enum ('available', 'full', 'paused', 'expired', 'disabled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.allocation_status as enum ('active', 'expired', 'interrupted', 'revoked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum ('pending', 'completed', 'unfulfilled', 'refunded', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ledger_entry_type as enum (
    'deposit_credit', 'purchase_debit', 'refund_credit', 'admin_credit', 'admin_debit', 'reversal'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.deposit_status as enum (
    'initiated', 'pending', 'successful', 'failed', 'abandoned', 'reversed', 'credited'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ticket_status as enum ('open', 'pending', 'resolved', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ticket_priority as enum ('low', 'normal', 'high', 'urgent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ticket_category as enum ('general', 'proxy', 'wallet', 'deposit', 'technical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_type as enum ('order', 'allocation', 'refund', 'deposit', 'support', 'system', 'security');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Updated-at helper
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key,
  username text not null,
  email text not null,
  display_name text,
  avatar_url text,
  role public.user_role not null default 'customer',
  status public.account_status not null default 'active',
  email_verified boolean not null default false,
  onboarding_complete boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_]{3,24}$'),
  constraint profiles_email_format check (position('@' in email) > 1)
);

create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));
create unique index if not exists profiles_email_lower_idx on public.profiles (lower(email));
create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_status_idx on public.profiles (status);
create index if not exists profiles_created_at_idx on public.profiles (created_at desc);

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  category text not null default 'proxy',
  duration_seconds integer,
  price_minor bigint not null default 0,
  currency text not null default 'NGN',
  is_active boolean not null default true,
  is_coming_soon boolean not null default false,
  features jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_price_non_negative check (price_minor >= 0),
  constraint products_currency_ngn check (currency = 'NGN'),
  constraint products_duration_positive check (duration_seconds is null or duration_seconds > 0)
);

create index if not exists products_active_idx on public.products (is_active, sort_order);
create index if not exists products_category_idx on public.products (category);

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
before update on public.products
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- proxy_inventory
-- ---------------------------------------------------------------------------
create table if not exists public.proxy_inventory (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  protocol public.proxy_protocol not null,
  host text not null,
  port integer not null,
  encrypted_username text,
  encrypted_password text,
  region text,
  provider_note text,
  purchase_cost_minor bigint not null default 0,
  currency text not null default 'NGN',
  max_seats integer not null default 10,
  uploaded_at timestamptz not null default now(),
  upstream_expires_at timestamptz not null,
  expiry_is_estimated boolean not null default true,
  status public.proxy_status not null default 'available',
  admin_notes text,
  created_by uuid references public.profiles (id),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proxy_port_range check (port between 1 and 65535),
  constraint proxy_max_seats_range check (max_seats between 1 and 100),
  constraint proxy_cost_non_negative check (purchase_cost_minor >= 0),
  constraint proxy_host_present check (length(trim(host)) > 0),
  constraint proxy_currency_ngn check (currency = 'NGN'),
  constraint proxy_expiry_after_upload check (upstream_expires_at > uploaded_at),
  constraint proxy_credentials_pair check (
    (encrypted_username is null and encrypted_password is null)
    or (encrypted_username is not null and encrypted_password is not null)
  )
);

create index if not exists proxy_inventory_status_idx on public.proxy_inventory (status, uploaded_at);
create index if not exists proxy_inventory_expiry_idx on public.proxy_inventory (upstream_expires_at);
create index if not exists proxy_inventory_protocol_idx on public.proxy_inventory (protocol);
create index if not exists proxy_inventory_region_idx on public.proxy_inventory (region);

drop trigger if exists proxy_inventory_touch_updated_at on public.proxy_inventory;
create trigger proxy_inventory_touch_updated_at
before update on public.proxy_inventory
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- wallet_accounts (one per customer; internal purchasing balance)
-- ---------------------------------------------------------------------------
create table if not exists public.wallet_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete restrict,
  currency text not null default 'NGN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wallet_currency_ngn check (currency = 'NGN')
);

drop trigger if exists wallet_accounts_touch_updated_at on public.wallet_accounts;
create trigger wallet_accounts_touch_updated_at
before update on public.wallet_accounts
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid not null references public.profiles (id) on delete restrict,
  product_id uuid not null references public.products (id) on delete restrict,
  amount_minor bigint not null,
  currency text not null default 'NGN',
  status public.order_status not null default 'pending',
  failure_reason text,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint orders_amount_positive check (amount_minor > 0),
  constraint orders_currency_ngn check (currency = 'NGN'),
  constraint orders_user_idempotency_unique unique (user_id, idempotency_key)
);

create index if not exists orders_user_created_idx on public.orders (user_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_idx on public.orders (created_at desc);

-- ---------------------------------------------------------------------------
-- proxy_allocations
-- ---------------------------------------------------------------------------
create table if not exists public.proxy_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  proxy_inventory_id uuid not null references public.proxy_inventory (id) on delete restrict,
  order_id uuid not null unique references public.orders (id) on delete restrict,
  product_id uuid not null references public.products (id) on delete restrict,
  status public.allocation_status not null default 'active',
  activated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz,
  interruption_reason text,
  created_at timestamptz not null default now(),
  constraint allocations_expiry_after_activation check (expires_at > activated_at)
);

create index if not exists allocations_inventory_active_idx
  on public.proxy_allocations (proxy_inventory_id, status, expires_at);
create index if not exists allocations_user_active_idx
  on public.proxy_allocations (user_id, status, expires_at);
create index if not exists allocations_order_idx on public.proxy_allocations (order_id);
create index if not exists allocations_expiry_idx on public.proxy_allocations (expires_at);

-- ---------------------------------------------------------------------------
-- wallet_ledger (immutable source of truth for balances)
-- ---------------------------------------------------------------------------
create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  wallet_account_id uuid not null references public.wallet_accounts (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete restrict,
  entry_type public.ledger_entry_type not null,
  amount_minor bigint not null,
  balance_after_minor bigint not null,
  currency text not null default 'NGN',
  reference text not null unique,
  related_order_id uuid references public.orders (id) on delete restrict,
  related_deposit_id uuid,
  description text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint ledger_amount_non_zero check (amount_minor <> 0),
  constraint ledger_balance_non_negative check (balance_after_minor >= 0),
  constraint ledger_currency_ngn check (currency = 'NGN'),
  constraint ledger_sign_matches_type check (
    (entry_type in ('deposit_credit', 'refund_credit', 'admin_credit') and amount_minor > 0)
    or (entry_type in ('purchase_debit', 'admin_debit') and amount_minor < 0)
    or entry_type = 'reversal'
  )
);

create index if not exists wallet_ledger_user_created_idx
  on public.wallet_ledger (user_id, created_at desc);
create index if not exists wallet_ledger_wallet_idx
  on public.wallet_ledger (wallet_account_id, created_at desc);
create index if not exists wallet_ledger_order_idx on public.wallet_ledger (related_order_id);
create index if not exists wallet_ledger_deposit_idx on public.wallet_ledger (related_deposit_id);

create or replace function public.forbid_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'WALLET_LEDGER_IMMUTABLE';
end;
$$;

drop trigger if exists wallet_ledger_no_update on public.wallet_ledger;
create trigger wallet_ledger_no_update
before update on public.wallet_ledger
for each row execute function public.forbid_ledger_mutation();

drop trigger if exists wallet_ledger_no_delete on public.wallet_ledger;
create trigger wallet_ledger_no_delete
before delete on public.wallet_ledger
for each row execute function public.forbid_ledger_mutation();

-- ---------------------------------------------------------------------------
-- deposits
-- ---------------------------------------------------------------------------
create table if not exists public.deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  provider text not null default 'paystack',
  provider_reference text not null unique,
  amount_minor bigint not null,
  currency text not null default 'NGN',
  status public.deposit_status not null default 'initiated',
  provider_transaction_id text,
  gateway_fee_minor bigint not null default 0,
  authorization_url text,
  channel text,
  metadata jsonb not null default '{}'::jsonb,
  verified_at timestamptz,
  credited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deposits_amount_positive check (amount_minor > 0),
  constraint deposits_fee_non_negative check (gateway_fee_minor >= 0),
  constraint deposits_currency_ngn check (currency = 'NGN'),
  constraint deposits_provider_check check (provider in ('paystack', 'demo'))
);

create index if not exists deposits_user_created_idx on public.deposits (user_id, created_at desc);
create index if not exists deposits_status_idx on public.deposits (status);
create index if not exists deposits_created_idx on public.deposits (created_at desc);

drop trigger if exists deposits_touch_updated_at on public.deposits;
create trigger deposits_touch_updated_at
before update on public.deposits
for each row execute function public.touch_updated_at();

alter table public.wallet_ledger
  add constraint wallet_ledger_related_deposit_fk
  foreign key (related_deposit_id) references public.deposits (id) on delete restrict;

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  category text not null default 'other',
  amount_minor bigint not null,
  currency text not null default 'NGN',
  expense_date date not null default current_date,
  proxy_inventory_id uuid references public.proxy_inventory (id) on delete restrict,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expenses_amount_positive check (amount_minor > 0),
  constraint expenses_currency_ngn check (currency = 'NGN')
);

create index if not exists expenses_date_idx on public.expenses (expense_date desc);
create index if not exists expenses_category_idx on public.expenses (category);
create index if not exists expenses_inventory_idx on public.expenses (proxy_inventory_id);

drop trigger if exists expenses_touch_updated_at on public.expenses;
create trigger expenses_touch_updated_at
before update on public.expenses
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- support
-- ---------------------------------------------------------------------------
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique,
  user_id uuid not null references public.profiles (id) on delete restrict,
  subject text not null,
  category public.ticket_category not null default 'general',
  priority public.ticket_priority not null default 'normal',
  status public.ticket_status not null default 'open',
  last_message_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ticket_subject_present check (length(trim(subject)) > 0)
);

create index if not exists tickets_user_idx on public.support_tickets (user_id, created_at desc);
create index if not exists tickets_status_idx on public.support_tickets (status, last_message_at desc);

drop trigger if exists tickets_touch_updated_at on public.support_tickets;
create trigger tickets_touch_updated_at
before update on public.support_tickets
for each row execute function public.touch_updated_at();

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  author_user_id uuid references public.profiles (id) on delete set null,
  is_staff boolean not null default false,
  body text not null,
  created_at timestamptz not null default now(),
  constraint support_message_body_present check (length(trim(body)) > 0)
);

create index if not exists support_messages_ticket_idx on public.support_messages (ticket_id, created_at);

-- ---------------------------------------------------------------------------
-- contact messages (public contact form; admin-visible, no customer thread)
-- ---------------------------------------------------------------------------
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  constraint contact_status_check check (status in ('new', 'read', 'archived')),
  constraint contact_email_format check (position('@' in email) > 1)
);

create index if not exists contact_messages_created_idx on public.contact_messages (created_at desc);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null default 'system',
  title text not null,
  body text not null default '',
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id, read_at);

-- ---------------------------------------------------------------------------
-- audit_logs (append-only)
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id bigserial primary key,
  actor_user_id uuid references public.profiles (id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_user_id, created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs (action);

create or replace function public.forbid_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'AUDIT_LOG_IMMUTABLE';
end;
$$;

drop trigger if exists audit_logs_no_update on public.audit_logs;
create trigger audit_logs_no_update
before update on public.audit_logs
for each row execute function public.forbid_audit_mutation();

drop trigger if exists audit_logs_no_delete on public.audit_logs;
create trigger audit_logs_no_delete
before delete on public.audit_logs
for each row execute function public.forbid_audit_mutation();

-- ---------------------------------------------------------------------------
-- webhook_events
-- ---------------------------------------------------------------------------
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_reference text not null,
  event_type text not null,
  payload_hash text not null,
  status text not null default 'received',
  error_detail text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint webhook_status_check check (status in ('received', 'processed', 'ignored', 'failed')),
  constraint webhook_provider_reference_unique unique (provider, provider_event_reference)
);

create index if not exists webhook_events_status_idx on public.webhook_events (status, received_at);

-- ---------------------------------------------------------------------------
-- app_settings (non-secret configuration only)
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  description text not null default '',
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- rate_limits (fixed-window counters; survives restarts)
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limits (
  bucket text primary key,
  count integer not null default 0,
  reset_at timestamptz not null
);

create index if not exists rate_limits_reset_idx on public.rate_limits (reset_at);

-- ---------------------------------------------------------------------------
-- job_runs
-- ---------------------------------------------------------------------------
create table if not exists public.job_runs (
  id bigserial primary key,
  job_name text not null,
  status text not null default 'running',
  details jsonb not null default '{}'::jsonb,
  error_detail text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint job_runs_status_check check (status in ('running', 'success', 'failed'))
);

create index if not exists job_runs_job_idx on public.job_runs (job_name, started_at desc);

-- ---------------------------------------------------------------------------
-- Wallet creation + balance helpers
-- ---------------------------------------------------------------------------
create or replace function public.ensure_wallet_account()
returns trigger
language plpgsql
as $$
begin
  insert into public.wallet_accounts (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists profiles_create_wallet on public.profiles;
create trigger profiles_create_wallet
after insert on public.profiles
for each row execute function public.ensure_wallet_account();

create or replace function public.wallet_balance(p_user_id uuid)
returns bigint
language sql
stable
as $$
  select coalesce(sum(amount_minor), 0)::bigint
  from public.wallet_ledger
  where user_id = p_user_id;
$$;

-- ---------------------------------------------------------------------------
-- Allocation safety trigger: hard server-side guard against an 11th seat
-- and against selling beyond the upstream inventory lifetime.
-- The row lock serialises concurrent inserts for the same inventory item.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_allocation_rules()
returns trigger
language plpgsql
as $$
declare
  v_max_seats integer;
  v_upstream_expiry timestamptz;
  v_active_seats integer;
begin
  if new.status <> 'active' then
    return new;
  end if;

  select max_seats, upstream_expires_at
    into v_max_seats, v_upstream_expiry
    from public.proxy_inventory
   where id = new.proxy_inventory_id
     for update;

  if not found then
    raise exception 'PROXY_INVENTORY_NOT_FOUND';
  end if;

  if v_upstream_expiry <= now() then
    raise exception 'PROXY_INVENTORY_EXPIRED';
  end if;

  if new.expires_at > v_upstream_expiry then
    raise exception 'INSUFFICIENT_UPSTREAM_LIFETIME';
  end if;

  select count(*)
    into v_active_seats
    from public.proxy_allocations
   where proxy_inventory_id = new.proxy_inventory_id
     and status = 'active'
     and expires_at > now()
     and id <> new.id;

  if v_active_seats >= v_max_seats then
    raise exception 'PROXY_AT_CAPACITY';
  end if;

  return new;
end;
$$;

drop trigger if exists proxy_allocations_enforce_rules on public.proxy_allocations;
create trigger proxy_allocations_enforce_rules
before insert or update of status, expires_at, proxy_inventory_id
on public.proxy_allocations
for each row execute function public.enforce_allocation_rules();

-- ---------------------------------------------------------------------------
-- Inventory status reconciliation
-- ---------------------------------------------------------------------------
create or replace function public.reconcile_proxy_status()
returns void
language sql
as $$
  update public.proxy_inventory i
     set status = case
       when s.active_seats >= i.max_seats then 'full'::public.proxy_status
       else 'available'::public.proxy_status
     end
    from (
      select proxy_inventory_id, count(*)::integer as active_seats
        from public.proxy_allocations
       where status = 'active' and expires_at > now()
       group by proxy_inventory_id
    ) s
   where s.proxy_inventory_id = i.id
     and i.status in ('available', 'full')
     and i.upstream_expires_at > now()
     and i.archived_at is null;
$$;

-- ---------------------------------------------------------------------------
-- Lifecycle job: expire customer entitlements, interrupt allocations on
-- expired upstream inventory, reconcile inventory status and notify users.
-- Safe to run repeatedly. It never disables an inventory item because a
-- single customer's package ended.
-- ---------------------------------------------------------------------------
create or replace function public.run_lifecycle_jobs()
returns jsonb
language plpgsql
as $$
declare
  v_expired integer := 0;
  v_interrupted integer := 0;
  v_inventory_expired integer := 0;
  v_started timestamptz := clock_timestamp();
begin
  -- 1. Expire individual customer entitlements whose clocks have elapsed.
  with expired as (
    update public.proxy_allocations
       set status = 'expired', ended_at = now()
     where status = 'active' and expires_at <= now()
    returning id, user_id, order_id
  ),
  notified as (
    insert into public.notifications (user_id, type, title, body, href)
    select distinct user_id,
           'allocation'::public.notification_type,
           'Proxy access expired',
           'Your BUYBIZ proxy access period has ended. Your connection details are now hidden. Upstream credentials may be shared, so BUYBIZ cannot individually revoke shared network access.',
           '/dashboard/proxies'
      from expired
    returning 1
  )
  select count(*) into v_expired from expired;

  -- 2. Interrupt active allocations whose upstream inventory has expired.
  with affected as (
    update public.proxy_allocations a
       set status = 'interrupted',
           ended_at = now(),
           interruption_reason = 'UPSTREAM_EXPIRED'
      from public.proxy_inventory i
     where a.proxy_inventory_id = i.id
       and a.status = 'active'
       and i.upstream_expires_at <= now()
    returning a.id, a.user_id
  ),
  notified as (
    insert into public.notifications (user_id, type, title, body, href)
    select distinct user_id,
           'allocation'::public.notification_type,
           'Your proxy access was interrupted',
           'The upstream proxy assigned to you expired earlier than your BUYBIZ package window. Your access has been marked interrupted. Contact support for assistance.',
           '/dashboard/support'
      from affected
    returning 1
  )
  select count(*) into v_interrupted from affected;

  -- 3. Mark inventory expired. Paused/disabled inventory also expires.
  update public.proxy_inventory
     set status = 'expired'
   where upstream_expires_at <= now()
     and status <> 'expired'
     and archived_at is null;
  get diagnostics v_inventory_expired = row_count;

  -- 4. Recompute available/full from live allocations (never from a counter).
  perform public.reconcile_proxy_status();

  insert into public.job_runs (job_name, status, details, finished_at)
  values (
    'lifecycle',
    'success',
    jsonb_build_object(
      'expiredAllocations', v_expired,
      'interruptedAllocations', v_interrupted,
      'expiredInventory', v_inventory_expired,
      'durationMs', round(extract(epoch from (clock_timestamp() - v_started)) * 1000)
    ),
    now()
  );

  return jsonb_build_object(
    'expiredAllocations', v_expired,
    'interruptedAllocations', v_interrupted,
    'expiredInventory', v_inventory_expired
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Settings bootstrap
-- ---------------------------------------------------------------------------
insert into public.app_settings (key, value, description) values
  ('inventory_default_max_seats', '10'::jsonb, 'Default maximum active customer seats per upstream proxy.'),
  ('allocation_safety_buffer_seconds', '3600'::jsonb, 'Extra upstream lifetime required beyond a customer package window.'),
  ('stock_expiry_default_days', '30'::jsonb, 'Assumed stock lifetime after upload when no provider expiry is entered.'),
  ('deposit_min_minor', '50000'::jsonb, 'Minimum wallet deposit in kobo (₦500).'),
  ('deposit_max_minor', '100000000'::jsonb, 'Maximum wallet deposit in kobo (₦1,000,000).'),
  ('maintenance_mode', 'false'::jsonb, 'When true, purchases and deposits are temporarily disabled.'),
  ('support_email', '""'::jsonb, 'Official support email. Leave blank until supplied by owner.'),
  ('inventory_expiry_remedy', '"manual_review"'::jsonb, 'Policy when upstream inventory expires early: manual_review (open owner decision).'),
  ('paystack_channels', '["card","bank","ussd","bank_transfer"]'::jsonb, 'Payment channels offered at checkout.'),
  ('legal_review_required', 'true'::jsonb, 'Terms and privacy are drafts until legal review is complete.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Launch catalogue. Prices are the exact launch prices in kobo and remain
-- editable through the admin product page.
-- ---------------------------------------------------------------------------
insert into public.products
  (slug, name, description, category, duration_seconds, price_minor, currency, is_active, is_coming_soon, features, sort_order)
values
  (
    'proxy-24-hours',
    '24-Hour Proxy',
    'A shared upstream proxy connection for 24 hours, allocated instantly when you buy with your BUYBIZ wallet.',
    'proxy',
    86400,
    50000,
    'NGN',
    true,
    false,
    '["Instant allocation", "Shared upstream proxy", "Connection details in your dashboard"]'::jsonb,
    10
  ),
  (
    'proxy-7-days',
    '7-Day Proxy',
    'Seven days of access to a shared upstream proxy, with a clear expiry timestamp and no auto-renewal.',
    'proxy',
    604800,
    100000,
    'NGN',
    true,
    false,
    '["Instant allocation", "Shared upstream proxy", "Expires exactly 7 days after activation"]'::jsonb,
    20
  ),
  (
    'proxy-30-days',
    '30-Day Proxy',
    'Thirty days of access to a shared upstream proxy. Subject to sufficient remaining upstream inventory life.',
    'proxy',
    2592000,
    300000,
    'NGN',
    true,
    false,
    '["Instant allocation", "Shared upstream proxy", "Expires exactly 30 days after activation"]'::jsonb,
    30
  ),
  (
    'virtual-phone-numbers',
    'Virtual Phone Numbers',
    'Planned service. Virtual numbers for verification and communication are not available for purchase yet.',
    'phone_numbers',
    null,
    0,
    'NGN',
    false,
    true,
    '["Coming soon"]'::jsonb,
    40
  ),
  (
    'paypal-services',
    'PayPal Services',
    'Planned service. BUYBIZ does not currently offer PayPal account or payment services.',
    'paypal',
    null,
    0,
    'NGN',
    false,
    true,
    '["Coming soon"]'::jsonb,
    50
  )
on conflict (slug) do nothing;
