
-- Optional battery-level reading, reported by the same device that
-- writes vitals. Nullable: older/simulated readings never had this
-- field, and the watchdog treats a missing value as "unknown", not low.
ALTER TABLE public.vitals ADD COLUMN battery_level SMALLINT;
ALTER TABLE public.vitals ADD CONSTRAINT vitals_battery_level_range
  CHECK (battery_level IS NULL OR (battery_level >= 0 AND battery_level <= 100));
