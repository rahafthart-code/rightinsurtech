-- trigger_dispatch_notifications() must never blow up the cron job it's
-- scheduled under, even before the one-time Vault secret setup has been
-- done (the expected state of a fresh database, including this test
-- database) — it should just skip dispatch quietly.
begin;
create extension if not exists pgtap with schema extensions;

select plan(1);

select lives_ok(
  'select public.trigger_dispatch_notifications()',
  'the dispatch trigger runs without error even with no service_role_key in Vault yet'
);

select * from finish();
rollback;
