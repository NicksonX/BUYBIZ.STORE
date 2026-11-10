-- Internal transfer table, ledger link and limits.
-- Runs after 00500 so the new enum values are committed and safe to reference.
-- The feature remains disabled by default.

alter table public.wallet_ledger drop constraint if exists ledger_sign_matches_type;
alter table public.wallet_ledger add constraint ledger_sign_matches_type check (
  (entry_type in ('deposit_credit', 'refund_credit', 'admin_credit', 'transfer_credit') and amount_minor > 0)
  or (entry_type in ('purchase_debit', 'admin_debit', 'transfer_debit') and amount_minor < 0)
  or entry_type = 'reversal'
);

create table if not exists public.wallet_transfers (
  id uuid primary key default gen_random_uuid(),
  sender_user_id uuid not null references public.profiles (id) on delete restrict,
  recipient_user_id uuid not null references public.profiles (id) on delete restrict,
  amount_minor bigint not null,
  currency text not null default 'NGN',
  status text not null default 'completed',
  reference text not null unique,
  note text,
  created_at timestamptz not null default now(),
  constraint transfer_amount_positive check (amount_minor > 0),
  constraint transfer_currency_ngn check (currency = 'NGN'),
  constraint transfer_parties_differ check (sender_user_id <> recipient_user_id),
  constraint transfer_status_check check (status in ('pending', 'completed', 'failed', 'reversed'))
);

create index if not exists wallet_transfers_sender_idx
  on public.wallet_transfers (sender_user_id, created_at desc);
create index if not exists wallet_transfers_recipient_idx
  on public.wallet_transfers (recipient_user_id, created_at desc);

alter table public.wallet_ledger
  add column if not exists related_transfer_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'wallet_ledger_related_transfer_fk'
  ) then
    alter table public.wallet_ledger
      add constraint wallet_ledger_related_transfer_fk
      foreign key (related_transfer_id) references public.wallet_transfers (id)
      on delete restrict;
  end if;
end $$;

insert into public.app_settings (key, value, description) values
  ('wallet_transfers_enabled', 'false'::jsonb, 'Internal wallet transfers are disabled until compliance and legal approval.'),
  ('wallet_transfer_min_minor', '10000'::jsonb, 'Minimum internal transfer in kobo (₦100).'),
  ('wallet_transfer_max_minor', '10000000'::jsonb, 'Maximum single internal transfer in kobo (₦100,000).'),
  ('wallet_transfer_daily_limit_minor', '5000000'::jsonb, 'Maximum outgoing internal transfers per sender per day in kobo (₦50,000).')
on conflict (key) do nothing;
