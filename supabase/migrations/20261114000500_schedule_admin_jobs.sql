-- Supabase-only scheduling. The application still exposes a manual run path.
create extension if not exists pg_cron with schema extensions;

do $$ begin
  if exists (select 1 from cron.job where jobname = 'buybiz-admin-reminders') then
    perform cron.unschedule('buybiz-admin-reminders');
  end if;
  if exists (select 1 from cron.job where jobname = 'buybiz-inactivity') then
    perform cron.unschedule('buybiz-inactivity');
  end if;
end $$;

select cron.schedule(
  'buybiz-admin-reminders',
  '*/15 * * * *',
  $$select public.run_admin_reminder_jobs();$$
);

select cron.schedule(
  'buybiz-inactivity',
  '17 * * * *',
  $$select public.run_inactivity_jobs();$$
);
