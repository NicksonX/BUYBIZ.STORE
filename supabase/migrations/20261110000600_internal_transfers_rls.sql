-- RLS for the disabled internal transfer table. No client may create or edit a
-- transfer. Users may read transfers in which they are the sender or recipient.
-- The trusted application server performs the double-entry transaction when the
-- feature flag is explicitly enabled after compliance approval.

revoke all on public.wallet_transfers from anon, authenticated;
grant select on public.wallet_transfers to authenticated;

alter table public.wallet_transfers enable row level security;

drop policy if exists "wallet_transfers_select_party" on public.wallet_transfers;
create policy "wallet_transfers_select_party"
  on public.wallet_transfers for select to authenticated
  using (
    sender_user_id = auth.uid()
    or recipient_user_id = auth.uid()
  );
