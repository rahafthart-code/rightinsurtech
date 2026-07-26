
-- Daily check: flip any active policy whose end_date has passed to
-- expired. Reuses the existing notify_policy_status_change trigger
-- (from the notifications migration) for the actual notification — that
-- trigger fires on any policy status UPDATE regardless of who/what made
-- it, so no duplicate notification logic is needed here.
CREATE OR REPLACE FUNCTION public.run_policy_expiry_check()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE public.policies
    SET status = 'expired'
    WHERE status = 'active' AND end_date IS NOT NULL AND end_date < CURRENT_DATE
    RETURNING 1
  )
  SELECT count(*) INTO expired_count FROM expired;

  RETURN expired_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.run_policy_expiry_check() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_policy_expiry_check() TO service_role;

-- Same defensive wrapping as the iot-watchdog cron migration: pg_cron
-- needs shared_preload_libraries at server startup, which a plain
-- CREATE EXTENSION can't retroactively arrange, so this can genuinely
-- fail in some environments. Wrapped so that failure here only skips
-- the scheduling instead of risking the rest of this migration batch.
DO $migration$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron could not be enabled here (%). Enable it from the Supabase Dashboard (Database -> Extensions -> pg_cron), then run: select cron.schedule(''policy-expiry-check'', ''0 3 * * *'', $cron$select public.run_policy_expiry_check();$cron$);', SQLERRM;
END
$migration$;

DO $migration$
BEGIN
  PERFORM cron.schedule(
    'policy-expiry-check',
    '0 3 * * *',
    $cron$ SELECT public.run_policy_expiry_check(); $cron$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not schedule policy-expiry-check via pg_cron (%). Once pg_cron is enabled, run: select cron.schedule(''policy-expiry-check'', ''0 3 * * *'', $cron$select public.run_policy_expiry_check();$cron$);', SQLERRM;
END
$migration$;
