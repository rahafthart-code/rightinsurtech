
-- IoT watchdog: flags insured assets whose monitoring device has gone
-- quiet for 30+ minutes, or whose last-known battery level is low.
-- Runs as a plain SQL function (SECURITY DEFINER) rather than doing this
-- multi-step, dedup-sensitive logic across several round trips from the
-- Edge Function — it's a relational problem, so it belongs in the
-- database, and it's directly testable with pgTAP the same way the rest
-- of this schema's business logic already is.
--
-- Dedup rule (mirrors the notification triggers added earlier this
-- project): only raise a new alert if the most recent alert of that
-- same kind for this asset predates the signal that justifies raising
-- it again — so a device that's been offline for two hours doesn't get
-- a fresh notification every time this function runs, but one that goes
-- offline, comes back, then goes offline again does.
CREATE OR REPLACE FUNCTION public.run_iot_watchdog()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alert_count INTEGER := 0;
  r RECORD;
  last_offline_notified_at TIMESTAMPTZ;
  last_battery_notified_at TIMESTAMPTZ;
BEGIN
  FOR r IN
    SELECT
      a.id AS asset_id,
      a.owner_id,
      a.name,
      COALESCE(lv.recorded_at, p.start_date::timestamptz) AS reference_at,
      lv.recorded_at AS last_vitals_at,
      lv.battery_level
    FROM public.assets a
    JOIN public.policies p ON p.asset_id = a.id AND p.status = 'active'
    LEFT JOIN LATERAL (
      SELECT v.recorded_at, v.battery_level
      FROM public.vitals v
      WHERE v.asset_id = a.id
      ORDER BY v.recorded_at DESC
      LIMIT 1
    ) lv ON true
  LOOP
    IF r.reference_at < now() - interval '30 minutes' THEN
      SELECT max(n.created_at) INTO last_offline_notified_at
      FROM public.notifications n
      WHERE n.related_asset_id = r.asset_id
        AND n.kind = 'device_offline'
        AND n.title = 'انقطع الاتصال بجهاز المراقبة';

      IF last_offline_notified_at IS NULL OR last_offline_notified_at < r.reference_at THEN
        INSERT INTO public.notifications (user_id, kind, title, body, related_asset_id)
        VALUES (
          r.owner_id,
          'device_offline',
          'انقطع الاتصال بجهاز المراقبة',
          r.name || ' لم يرسل أي بيانات منذ ' ||
            round(extract(epoch FROM (now() - r.reference_at)) / 60) || ' دقيقة تقريباً.',
          r.asset_id
        );
        alert_count := alert_count + 1;
      END IF;
    END IF;

    IF r.battery_level IS NOT NULL AND r.battery_level < 15 THEN
      SELECT max(n.created_at) INTO last_battery_notified_at
      FROM public.notifications n
      WHERE n.related_asset_id = r.asset_id
        AND n.kind = 'device_offline'
        AND n.title = 'بطارية جهاز المراقبة منخفضة';

      IF last_battery_notified_at IS NULL OR last_battery_notified_at < r.last_vitals_at THEN
        INSERT INTO public.notifications (user_id, kind, title, body, related_asset_id)
        VALUES (
          r.owner_id,
          'device_offline',
          'بطارية جهاز المراقبة منخفضة',
          'بطارية جهاز ' || r.name || ' عند ' || r.battery_level || '٪ — يُنصح بشحنه قريباً.',
          r.asset_id
        );
        alert_count := alert_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN alert_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.run_iot_watchdog() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_iot_watchdog() TO service_role;
