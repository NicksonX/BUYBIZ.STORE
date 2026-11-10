-- ============================================================================
-- BUYBIZ: Row Level Security and least-privilege grants
-- Apply only on Supabase. The application's trusted server uses a direct
-- database connection; these policies protect any direct PostgREST/client
-- access with the anon or authenticated role.
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.proxy_inventory enable row level security;
alter table public.orders enable row level security;
alter table public.proxy_allocations enable row level security;
alter table public.wallet_accounts enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.deposits enable row level security;
alter table public.expenses enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.contact_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.webhook_events enable row level security;
alter table public.app_settings enable row level security;
alter table public.rate_limits enable row level security;
alter table public.job_runs enable row level security;

-- Revoke broad default grants, then add only the privileges clients need.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant usage on schema public to anon, authenticated;

-- Public catalogue.
grant select on public.products to anon, authenticated;

-- Profiles: read own (admins read all); update only safe, self-owned fields.
grant select on public.profiles to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

-- Customer-owned financial and service history (read only).
grant select on public.orders to authenticated;
grant select on public.proxy_allocations to authenticated;
grant select on public.wallet_accounts to authenticated;
grant select on public.wallet_ledger to authenticated;
grant select on public.deposits to authenticated;

-- Notifications: read and mark read.
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Support: customers create tickets/messages and read their own threads.
grant select, insert on public.support_tickets to authenticated;
grant select, insert on public.support_messages to authenticated;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read"
  on public.products for select to anon, authenticated
  using (is_active or is_coming_soon);

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own"
  on public.orders for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "allocations_select_own" on public.proxy_allocations;
create policy "allocations_select_own"
  on public.proxy_allocations for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "wallet_accounts_select_own" on public.wallet_accounts;
create policy "wallet_accounts_select_own"
  on public.wallet_accounts for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "wallet_ledger_select_own" on public.wallet_ledger;
create policy "wallet_ledger_select_own"
  on public.wallet_ledger for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "deposits_select_own" on public.deposits;
create policy "deposits_select_own"
  on public.deposits for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "tickets_select_own" on public.support_tickets;
create policy "tickets_select_own"
  on public.support_tickets for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "tickets_insert_own" on public.support_tickets;
create policy "tickets_insert_own"
  on public.support_tickets for insert to authenticated
  with check (user_id = auth.uid() and status = 'open');

drop policy if exists "ticket_messages_select_own" on public.support_messages;
create policy "ticket_messages_select_own"
  on public.support_messages for select to authenticated
  using (
    exists (
      select 1 from public.support_tickets t
      where t.id = support_messages.ticket_id and t.user_id = auth.uid()
    )
  );

drop policy if exists "ticket_messages_insert_own" on public.support_messages;
create policy "ticket_messages_insert_own"
  on public.support_messages for insert to authenticated
  with check (
    is_staff = false
    and author_user_id = auth.uid()
    and exists (
      select 1 from public.support_tickets t
      where t.id = support_messages.ticket_id
        and t.user_id = auth.uid()
        and t.status <> 'closed'
    )
  );

-- Intentionally no client policies for:
--   proxy_inventory (encrypted credentials; server-only)
--   expenses, audit_logs, webhook_events, app_settings, rate_limits, job_runs
--   contact_messages (server-side intake only)
-- The trusted application server connects directly to Postgres and performs
-- role checks in code before every administrative operation.
