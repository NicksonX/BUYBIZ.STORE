-- $3 Ambassador wallet addresses: valid BEP20 submissions are auto-verified.
update public.ambassador_wallet_addresses
   set status='verified', verified_at=coalesce(verified_at,now()), updated_at=now()
 where status='pending' and address ~ '^0x[0-9a-fA-F]{40}$';

-- $10 campaign payout addresses: valid BEP20 addresses are auto-verified.
alter table public.reward_payouts add column if not exists address_status text not null default 'verified';
alter table public.reward_payouts drop constraint if exists reward_payout_address_status_check;
alter table public.reward_payouts add constraint reward_payout_address_status_check check (address_status in ('pending','verified','rejected'));
update public.reward_payouts set address_status='verified', updated_at=now()
 where wallet_address ~ '^0x[0-9a-fA-F]{40}$' and address_status <> 'verified';
