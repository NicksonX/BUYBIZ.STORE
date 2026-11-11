-- Referral rows are written only by the trusted application server.

revoke all on public.referrals from anon, authenticated;
grant select on public.referrals to authenticated;
alter table public.referrals enable row level security;

drop policy if exists "referrals_select_own_or_admin" on public.referrals;
create policy "referrals_select_own_or_admin"
  on public.referrals for select to authenticated
  using (referrer_id = auth.uid() or public.is_admin());
