
-- Schedule the watchdog directly via pg_cron -> a plain SQL function
-- call. Deliberately NOT routed through HTTP/pg_net to the Edge
-- Function for the scheduled run: that would require storing the
-- service-role key somewhere pg_net can read it (Vault), for no benefit
-- here since the function already lives in this database. The Edge
-- Function (supabase/functions/iot-watchdog) still exists for on-demand/
-- external invocation — this migration only wires up the automatic
-- every-5-minutes run.
--
-- pg_cron needs to be loaded via shared_preload_libraries at server
-- startup, which a plain CREATE EXTENSION can't retroactively arrange —
-- so this genuinely fails on some local/CLI-managed Postgres instances
-- and on hosted projects where it isn't enabled yet. Wrapped so that
-- failure here only skips the scheduling (with a NOTICE explaining how
-- to finish it manually) instead of potentially rolling back this whole
-- migration batch and taking unrelated schema changes down with it.
DO $migration$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron could not be enabled here (%). Enable it from the Supabase Dashboard (Database -> Extensions -> pg_cron), then run: select cron.schedule(''iot-watchdog'', ''*/5 * * * *'', $cron$select public.run_iot_watchdog();$cron$);', SQLERRM;
END
$migration$;

DO $migration$
BEGIN
  PERFORM cron.schedule(
    'iot-watchdog',
    '*/5 * * * *',
    $cron$ SELECT public.run_iot_watchdog(); $cron$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not schedule iot-watchdog via pg_cron (%). Once pg_cron is enabled, run: select cron.schedule(''iot-watchdog'', ''*/5 * * * *'', $cron$select public.run_iot_watchdog();$cron$);', SQLERRM;
END
$migration$;
