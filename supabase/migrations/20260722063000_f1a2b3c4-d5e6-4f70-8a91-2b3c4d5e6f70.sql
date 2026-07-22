
-- New notification kind for the IoT watchdog (offline device / low
-- battery alerts). Isolated in its own migration: a newly added enum
-- value cannot be used in an INSERT within the same transaction it was
-- added in on older Postgres, so this must land in a separate migration
-- from anything that actually inserts a 'device_offline' notification.
ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'device_offline';
