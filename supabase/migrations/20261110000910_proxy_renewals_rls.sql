-- Renewal rows are written only by the trusted server. Customers may read their
-- own renewal trail; admins may read all.

revoke all on public.proxy_renewals from anon, authenticated;
grant select on public.proxy_renewals to authenticated;
alter table public.proxy_renewals enable row level security;

drop policy if exists "proxy_renewals_select_own_or_admin" on public.proxy_renewals;
create policy "proxy_renewals_select_own_or_admin"
  on public.proxy_renewals for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
