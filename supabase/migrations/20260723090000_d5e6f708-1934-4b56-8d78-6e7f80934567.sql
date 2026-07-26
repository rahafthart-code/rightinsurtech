
-- Real Supabase projects grant these automatically at provisioning time
-- (outside of any user migration) so that RLS policies actually get a
-- chance to run in the first place — without table-level access, the
-- role is rejected before RLS is ever evaluated. Some local/test
-- database setups don't fully replicate that provisioning step, so make
-- it explicit and idempotent here. Harmless on a real hosted project:
-- these grants already exist there, this just re-states them.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
