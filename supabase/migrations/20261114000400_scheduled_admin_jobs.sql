-- Server-side, idempotent account inactivity and administrator reminder jobs.
-- These functions are safe to call repeatedly.

create or replace function public.run_inactivity_jobs()
returns jsonb
language plpgsql
as $$
declare
  v_days integer := 60;
  v_warn_days integer := 7;
  v_frozen integer := 0;
  v_warned integer := 0;
begin
  select coalesce((value #>> '{}')::int, 60) into v_days
    from public.app_settings where key = 'inactivity_days';
  v_days := greatest(1, least(coalesce(v_days, 60), 3650));
  select coalesce((value #>> '{}')::int, 7) into v_warn_days
    from public.app_settings where key = 'inactivity_warning_days';
  v_warn_days := greatest(1, least(coalesce(v_warn_days, 7), 60));

  -- Warn admins before the freeze. One warning per customer per day.
  with approaching as (
    select p.id, p.username, p.last_activity_at
      from public.profiles p
     where p.role = 'customer'
       and p.status = 'active'
       and p.onboarding_complete = true
       and p.last_activity_at <= now() - make_interval(days => v_days - v_warn_days)
       and p.last_activity_at > now() - make_interval(days => v_days)
  ),
  inserted as (
    insert into public.admin_notifications
      (type, severity, title, body, action_url, related_user_id, dedupe_key)
    select 'inactivity_warning', 'warning',
           'Customer approaching inactivity freeze',
           p.username || ' has been inactive since ' || to_char(p.last_activity_at, 'DD Mon YYYY') || '. The account will freeze after ' || v_days || ' days.',
           '/admin/inactivity',
           p.id,
           'inactivity_warning:' || p.id::text || ':' || current_date::text
      from approaching p
    on conflict (dedupe_key) do nothing
    returning 1
  )
  select count(*) into v_warned from inserted;

  -- Freeze only customers who are still active and past the configured cutoff.
  with due as (
    select p.id, p.username, p.last_activity_at
      from public.profiles p
     where p.role = 'customer'
       and p.status = 'active'
       and p.onboarding_complete = true
       and p.last_activity_at <= now() - make_interval(days => v_days)
     for update skip locked
  ),
  frozen as (
    update public.profiles p
       set status = 'frozen',
           frozen_at = now(),
           freeze_reason = 'Inactivity for ' || v_days || ' days',
           updated_at = now()
      from due d
     where p.id = d.id and p.status = 'active'
     returning p.id, p.username, p.last_activity_at
  ),
  freezes as (
    insert into public.account_freezes (user_id, reason, last_activity_at, frozen_at)
    select id, 'inactivity', last_activity_at, now()
      from frozen
    returning id, user_id, frozen_at
  ),
  user_notifications as (
    insert into public.notifications (user_id, type, title, body, href)
    select f.user_id, 'security',
           'Your BUYBIZ account was frozen',
           'Your account was frozen after ' || v_days || ' days without customer activity. Your wallet credits and history are preserved. Sign in and reactivate to regain access.',
           '/reactivate'
      from freezes f
    returning 1
  ),
  admin_notifications as (
    insert into public.admin_notifications
      (type, severity, title, body, action_url, related_user_id, dedupe_key)
    select 'account_frozen', 'warning',
           'Customer account frozen for inactivity',
           u.username || ' was frozen after ' || v_days || ' days without qualifying activity. Wallet balance is preserved.',
           '/admin/inactivity',
           f.user_id,
           'account_frozen:' || f.id::text
      from freezes f join public.profiles u on u.id = f.user_id
    on conflict (dedupe_key) do nothing
    returning 1
  )
  select count(*) into v_frozen from freezes;

  insert into public.job_runs (job_name, status, details, finished_at)
  values ('inactivity', 'success',
          jsonb_build_object('frozen', v_frozen, 'warned', v_warned, 'inactivityDays', v_days),
          now());

  return jsonb_build_object('frozen', v_frozen, 'warned', v_warned, 'inactivityDays', v_days);
end;
$$;

create or replace function public.run_admin_reminder_jobs()
returns jsonb
language plpgsql
as $$
declare
  v_rotation integer := 0;
  v_expiry integer := 0;
  v_full integer := 0;
begin
  -- Credential rotation reminders. A due reminder remains overdue until the
  -- administrator confirms a safe rotation.
  with due as (
    select i.id, i.label, i.product_slug, i.rotation_interval_hours,
           i.next_rotation_at,
           (select count(*)::int from public.proxy_allocations a
             where a.proxy_inventory_id = i.id and a.status = 'active'
               and a.expires_at > now()) as active_count,
           (select count(*)::int from public.proxy_allocations a
             where a.proxy_inventory_id = i.id and a.status = 'active'
               and a.expires_at <= now()) as expired_count
      from public.proxy_inventory i
     where i.archived_at is null
       and i.rotation_interval_hours is not null
       and i.next_rotation_at is not null
       and i.next_rotation_at <= now()
  ),
  inserted as (
    insert into public.admin_notifications
      (type, severity, title, body, action_url, related_inventory_id, dedupe_key)
    select case when d.rotation_interval_hours = 24 then 'rotation_due_24h' else 'rotation_due_7d' end,
           case when d.next_rotation_at + make_interval(hours => d.rotation_interval_hours) <= now()
                then 'critical' else 'warning' end,
           case when d.rotation_interval_hours = 24 then '24-hour proxy credential rotation due'
                else '7-day proxy credential rotation due' end,
           case when d.rotation_interval_hours = 24
                then 'BUYBIZ REMINDER: Your 24-hour proxy credentials are due for rotation. Please update the upstream username and password in your proxy provider dashboard, then update the credentials in BUYBIZ.'
                else 'BUYBIZ REMINDER: Your 7-day proxy credentials are due for rotation. Please update the upstream username and password at your proxy provider, then update BUYBIZ.' end,
           '/admin/rotation',
           d.id,
           'rotation_due:' || d.id::text || ':' || to_char(d.next_rotation_at, 'YYYYMMDDHH24MI')
      from due d
    on conflict (dedupe_key) do nothing
    returning 1
  )
  select count(*) into v_rotation from inserted;

  -- Upstream inventory expiry warnings.
  with expiring as (
    select i.id, i.label, i.upstream_expires_at
      from public.proxy_inventory i
     where i.archived_at is null
       and i.upstream_expires_at > now()
       and i.upstream_expires_at <= now() + interval '7 days'
  ),
  inserted as (
    insert into public.admin_notifications
      (type, severity, title, body, action_url, related_inventory_id, dedupe_key)
    select 'inventory_expiring', 'warning',
           'Proxy inventory expiring soon',
           e.label || ' expires ' || to_char(e.upstream_expires_at, 'DD Mon YYYY HH24:MI') || '. Review replacement stock before it expires.',
           '/admin/inventory/' || e.id::text,
           e.id,
           'inventory_expiring:' || e.id::text || ':' || current_date::text
      from expiring e
    on conflict (dedupe_key) do nothing
    returning 1
  )
  select count(*) into v_expiry from inserted;

  -- Full inventory warning.
  with full_inventory as (
    select i.id, i.label, i.max_seats
      from public.proxy_inventory i
     where i.archived_at is null and i.status = 'full'
  ),
  inserted as (
    insert into public.admin_notifications
      (type, severity, title, body, action_url, related_inventory_id, dedupe_key)
    select 'inventory_full', 'info',
           'Proxy inventory is full',
           f.label || ' has reached its seat limit. Add another proxy or credential group if you want to keep selling that package.',
           '/admin/inventory/' || f.id::text,
           f.id,
           'inventory_full:' || f.id::text || ':' || current_date::text
      from full_inventory f
    on conflict (dedupe_key) do nothing
    returning 1
  )
  select count(*) into v_full from inserted;

  insert into public.job_runs (job_name, status, details, finished_at)
  values ('admin_reminders', 'success',
          jsonb_build_object('rotationReminders', v_rotation, 'expiryWarnings', v_expiry, 'fullWarnings', v_full),
          now());

  return jsonb_build_object('rotationReminders', v_rotation, 'expiryWarnings', v_expiry, 'fullWarnings', v_full);
end;
$$;
