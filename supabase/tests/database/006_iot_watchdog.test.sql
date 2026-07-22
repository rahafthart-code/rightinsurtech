-- Coverage for run_iot_watchdog(): offline detection, low-battery
-- detection, no-duplicate-alert behavior, and that a healthy asset
-- generates nothing at all. (Testing "goes offline, recovers, then goes
-- offline again -> a second alert" isn't practical inside a single
-- instantaneous pgTAP transaction, since that scenario depends on wall-
-- clock time actually advancing between a fresh check-in and it going
-- stale again — it's covered by code review of the dedup predicate
-- instead: a new alert requires the *last* notification to predate the
-- *current* reference reading, which is exactly "a fresher signal
-- arrived since we last complained.")
begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

select tests.create_supabase_user('watchdog-a@rls-test.dev') as owner_a \gset
select tests.create_supabase_user('watchdog-b@rls-test.dev') as owner_b \gset

-- Owner A: an asset that has never reported in, insured two hours ago —
-- should be flagged offline.
select gen_random_uuid() as offline_asset \gset
insert into public.assets (id, owner_id, type, name, estimated_value)
  values (:'offline_asset', :'owner_a', 'horse', 'Silent Horse', 500000);
insert into public.policies (owner_id, asset_id, plan, monthly_price, coverage_amount, status, start_date)
  values (:'owner_a', :'offline_asset', 'hares', 490, 500000, 'active', current_date - 1);

-- Owner A: a second asset reporting live, but with a low battery.
select gen_random_uuid() as low_battery_asset \gset
insert into public.assets (id, owner_id, type, name, estimated_value)
  values (:'low_battery_asset', :'owner_a', 'camel', 'Low Battery Camel', 800000);
insert into public.policies (owner_id, asset_id, plan, monthly_price, coverage_amount, status, start_date)
  values (:'owner_a', :'low_battery_asset', 'raee', 790, 1500000, 'active', current_date - 1);
insert into public.vitals (asset_id, owner_id, heart_rate, temperature, battery_level)
  values (:'low_battery_asset', :'owner_a', 40, 37.8, 10);

-- Owner B: a perfectly healthy, recently-reporting asset — should
-- generate nothing.
select gen_random_uuid() as healthy_asset \gset
insert into public.assets (id, owner_id, type, name, estimated_value)
  values (:'healthy_asset', :'owner_b', 'falcon', 'Healthy Falcon', 300000);
insert into public.policies (owner_id, asset_id, plan, monthly_price, coverage_amount, status, start_date)
  values (:'owner_b', :'healthy_asset', 'hares', 490, 500000, 'active', current_date - 1);
insert into public.vitals (asset_id, owner_id, heart_rate, temperature, battery_level)
  values (:'healthy_asset', :'owner_b', 42, 37.9, 80);

select lives_ok('select public.run_iot_watchdog()', 'the watchdog runs without error');

select is(
  (select count(*) from public.notifications
     where related_asset_id = :'offline_asset' and kind = 'device_offline'
       and title = 'انقطع الاتصال بجهاز المراقبة')::int,
  1,
  'the never-reported asset got exactly one offline alert'
);

select is(
  (select user_id from public.notifications
     where related_asset_id = :'offline_asset' and kind = 'device_offline'
     limit 1),
  :'owner_a',
  'the offline alert went to the correct owner'
);

select is(
  (select count(*) from public.notifications
     where related_asset_id = :'low_battery_asset' and kind = 'device_offline'
       and title = 'بطارية جهاز المراقبة منخفضة')::int,
  1,
  'the low-battery asset got exactly one battery alert'
);

select is(
  (select count(*) from public.notifications where related_asset_id = :'healthy_asset')::int,
  0,
  'the healthy, recently-reporting asset got no alerts at all'
);

-- Run it again immediately: nothing should change, since neither asset
-- has received a fresher signal since the alerts above were raised.
select lives_ok('select public.run_iot_watchdog()', 'a second run also completes without error');

select is(
  (select count(*) from public.notifications
     where related_asset_id = :'offline_asset' and kind = 'device_offline')::int,
  1,
  'the offline asset was not re-notified on the second run'
);

select is(
  (select count(*) from public.notifications
     where related_asset_id = :'low_battery_asset' and kind = 'device_offline')::int,
  1,
  'the low-battery asset was not re-notified on the second run either'
);

select * from finish();
rollback;
