// Client-side mirror of the thresholds used by public.run_iot_watchdog()
// (see supabase/migrations/20260722063500_*.sql). Used for an
// immediate, live "offline" badge on the dashboard — computed from
// whatever the client already has in memory, independent of whether the
// backend watchdog has run yet. The actual alert/notification decision
// (with dedup) always happens server-side; this is display-only.
export const OFFLINE_THRESHOLD_MINUTES = 30;
export const LOW_BATTERY_THRESHOLD = 15;

export function minutesSince(iso: string, now: number = Date.now()): number {
  return (now - new Date(iso).getTime()) / 60_000;
}

export function isOffline(lastSeenIso: string | null, now: number = Date.now()): boolean {
  if (!lastSeenIso) return true;
  return minutesSince(lastSeenIso, now) >= OFFLINE_THRESHOLD_MINUTES;
}

export function isLowBattery(batteryLevel: number | null | undefined): boolean {
  return batteryLevel != null && batteryLevel < LOW_BATTERY_THRESHOLD;
}
