-- Customers may read their own termination and switch records. Writes remain
-- server-only through the trusted application connection.

alter table public.proxy_terminations enable row level security;
alter table public.proxy_switches enable row level security;

grant select on public.proxy_terminations to authenticated;
grant select on public.proxy_switches to authenticated;

drop policy if exists "proxy_terminations_select_own" on public.proxy_terminations;
create policy "proxy_terminations_select_own"
  on public.proxy_terminations for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "proxy_switches_select_own" on public.proxy_switches;
create policy "proxy_switches_select_own"
  on public.proxy_switches for select to authenticated
  using (user_id = auth.uid());
