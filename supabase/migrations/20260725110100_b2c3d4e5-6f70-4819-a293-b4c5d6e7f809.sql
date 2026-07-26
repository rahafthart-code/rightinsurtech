
-- Every minute, ask the dispatch-notifications Edge Function to send
-- any SMS/email notifications that haven't gone out yet. The actual
-- SMS (Authentica) / email (Resend) provider calls live in that Edge
-- Function, not here — this migration only wires up the periodic
-- trigger, since calling it needs an authenticated HTTP request
-- (pg_net), and pg_net calls need the service-role key from
-- *somewhere* readable by SQL.
--
-- MANUAL ONE-TIME SETUP REQUIRED (cannot be done in a migration — a
-- secret value must never be committed to git): from the SQL editor,
-- run once:
--   select vault.create_secret('<your-service-role-key>', 'service_role_key');
-- Until that's done, trigger_dispatch_notifications() below detects the
-- missing secret and skips dispatch with a NOTICE instead of failing.
DO $migration$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_net;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_net could not be enabled here (%). Enable it from the Dashboard (Database -> Extensions -> pg_net).', SQLERRM;
END
$migration$;

CREATE OR REPLACE FUNCTION public.trigger_dispatch_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE
  service_key TEXT;
  project_url TEXT := 'https://tltikyluotiynkfjfxdc.supabase.co';
BEGIN
  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  IF service_key IS NULL THEN
    RAISE NOTICE 'service_role_key not found in Vault; skipping notification dispatch this run. See the setup note in this migration file.';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := project_url || '/functions/v1/dispatch-notifications',
    headers := jsonb_build_object('Authorization', 'Bearer ' || service_key, 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
EXCEPTION WHEN undefined_table THEN
  -- vault schema/extension not available in this environment at all.
  RAISE NOTICE 'Supabase Vault is not available here; skipping notification dispatch this run.';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.trigger_dispatch_notifications() FROM PUBLIC, anon, authenticated;

DO $migration$
BEGIN
  PERFORM cron.schedule(
    'dispatch-notifications',
    '* * * * *',
    $cron$ SELECT public.trigger_dispatch_notifications(); $cron$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not schedule dispatch-notifications via pg_cron (%). Once pg_cron is enabled, run: select cron.schedule(''dispatch-notifications'', ''* * * * *'', $cron$select public.trigger_dispatch_notifications();$cron$);', SQLERRM;
END
$migration$;
