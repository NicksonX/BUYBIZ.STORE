-- ============================================================================
-- BUYBIZ: scheduled lifecycle processing on Supabase
-- Requires pg_cron (available on Supabase). If the extension is unavailable,
-- call the secured /api/cron/lifecycle endpoint from an external scheduler.
-- ============================================================================

create extension if not exists pg_cron with schema extensions;

-- Remove a previous registration so this migration is re-runnable.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'buybiz-lifecycle') then
    perform cron.unschedule('buybiz-lifecycle');
  end if;
end $$;

select cron.schedule(
  'buybiz-lifecycle',
  '*/10 * * * *',
  $$select public.run_lifecycle_jobs();$$
);

-- Reconciliation of stale pending deposits is performed by the application's
-- secured cron endpoint because it must call the Paystack verify API. Schedule
-- that endpoint every 15 minutes from an external scheduler, or invoke the
-- endpoint from a Supabase Edge Function using CRON_SECRET.
