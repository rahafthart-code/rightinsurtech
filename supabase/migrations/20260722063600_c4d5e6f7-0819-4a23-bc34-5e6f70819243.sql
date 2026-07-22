
-- Schedule the watchdog directly via pg_cron -> a plain SQL function
-- call. Deliberately NOT routed through HTTP/pg_net to the Edge
-- Function for the scheduled run: that would require storing the
-- service-role key somewhere pg_net can read it (Vault), for no benefit
-- here since the function already lives in this database. The Edge
-- Function (supabase/functions/iot-watchdog) still exists for on-demand/
-- external invocation — this migration only wires up the automatic
-- every-5-minutes run.
--
-- NOTE: pg_cron availability depends on your Supabase project's plan/
-- settings. If this extension can't be created here, enable it from the
-- Dashboard (Database -> Extensions -> pg_cron) and rerun just the
-- cron.schedule() call below.
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'iot-watchdog',
  '*/5 * * * *',
  $$ SELECT public.run_iot_watchdog(); $$
);
