-- Notifications: no client can insert one directly (they only ever come
-- from the SECURITY DEFINER triggers), an owner may only flip read_at on
-- their own rows, and the claim-status / vitals-alert triggers actually
-- fire and produce the right row.
begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

select gen_random_uuid() as owner_a \gset
select gen_random_uuid() as owner_b \gset
select gen_random_uuid() as admin_id \gset
insert into auth.users (id, email) values
  (:'owner_a', 'notif-a@rls-test.dev'),
  (:'owner_b', 'notif-b@rls-test.dev'),
  (:'admin_id', 'notif-admin@rls-test.dev');
insert into public.user_roles (user_id, role) values (:'admin_id', 'admin');

select gen_random_uuid() as asset_a \gset
insert into public.assets (id, owner_id, type, name, estimated_value)
  values (:'asset_a', :'owner_a', 'falcon', 'Notif Test Falcon', 300000);

select gen_random_uuid() as policy_a \gset
insert into public.policies (id, owner_id, asset_id, plan, monthly_price, coverage_amount, status)
  values (:'policy_a', :'owner_a', :'asset_a', 'hares', 490, 500000, 'active');

select gen_random_uuid() as claim_a \gset
insert into public.claims (id, owner_id, policy_id, asset_id, reason)
  values (:'claim_a', :'owner_a', :'policy_a', :'asset_a', 'مرض');

-- An owner cannot insert a notification directly — only the triggers can.
select set_config(
  'request.jwt.claims',
  json_build_object('sub', :'owner_a', 'role', 'authenticated')::text,
  true
);
set local role authenticated;

select throws_ok(
  format(
    'insert into public.notifications (user_id, kind, title) values (%L, %L, %L)',
    :'owner_a', 'claim_status', 'مطالبة مزيفة'
  ),
  '42501',
  null,
  'a user cannot fabricate their own notification'
);

-- Admin approves the claim -> the trigger should fire and notify owner_a.
select set_config(
  'request.jwt.claims',
  json_build_object('sub', :'admin_id', 'role', 'authenticated')::text,
  true
);
update public.claims set status = 'approved' where id = :'claim_a';

select set_config(
  'request.jwt.claims',
  json_build_object('sub', :'owner_a', 'role', 'authenticated')::text,
  true
);

select is(
  (select count(*) from public.notifications
     where user_id = :'owner_a' and kind = 'claim_status' and related_claim_id = :'claim_a')::int,
  1,
  'approving the claim created exactly one notification for its owner'
);

select id as notif_id from public.notifications
  where user_id = :'owner_a' and kind = 'claim_status' and related_claim_id = :'claim_a' \gset

select is(
  (select read_at from public.notifications where id = :'notif_id') is null,
  true,
  'the new notification starts unread'
);

select lives_ok(
  format('update public.notifications set read_at = now() where id = %L', :'notif_id'),
  'the owner can mark their own notification as read'
);

select is(
  (select read_at from public.notifications where id = :'notif_id') is not null,
  true,
  'the read_at update actually took effect'
);

select throws_ok(
  format('update public.notifications set title = %L where id = %L', 'عنوان مزيف', :'notif_id'),
  'P0001',
  null,
  'the owner cannot rewrite the notification title — only read_at is mutable'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', :'owner_b', 'role', 'authenticated')::text,
  true
);
select is_empty(
  format('select 1 from public.notifications where id = %L', :'notif_id'),
  'an unrelated user cannot see this notification'
);

-- An out-of-range vital reading should also raise a notification.
select set_config(
  'request.jwt.claims',
  json_build_object('sub', :'owner_a', 'role', 'authenticated')::text,
  true
);
insert into public.vitals (asset_id, owner_id, heart_rate, temperature)
  values (:'asset_a', :'owner_a', 140, 39);

select is(
  (select count(*) from public.notifications
     where user_id = :'owner_a' and kind = 'vital_alert' and related_asset_id = :'asset_a')::int,
  1,
  'an abnormal vital reading raised exactly one health alert'
);

select lives_ok(
  format('delete from public.notifications where id = %L', :'notif_id'),
  'the owner can delete their own notification (it is not an audit record like claims/policies)'
);

select is(
  (select count(*) from public.notifications where id = :'notif_id')::int,
  0,
  'the deleted notification is actually gone'
);

select * from finish();
rollback;
