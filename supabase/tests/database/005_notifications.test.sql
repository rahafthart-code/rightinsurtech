-- Notifications: no client can insert one directly (they only ever come
-- from the SECURITY DEFINER triggers), an owner may only flip read_at on
-- their own rows, and the claim-status / vitals-alert triggers actually
-- fire and produce the right row.
begin;
create extension if not exists pgtap with schema extensions;

-- `supabase test db` does not run supabase/seed.sql before executing
-- these files (only `supabase db reset` does), so the auth.users test
-- helper has to be self-contained in each file instead. Real
-- auth.users has several NOT NULL columns with no safe default in every
-- schema version — inserting just (id, email) fails outright. No real
-- password is set since these tests simulate the session directly via
-- request.jwt.claims and never do a real login.
create schema if not exists tests;
create or replace function tests.create_supabase_user(user_email text, user_id uuid default gen_random_uuid())
returns uuid
language plpgsql
security definer
set search_path = auth, public, pg_temp
as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, recovery_sent_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', user_id, 'authenticated', 'authenticated',
    user_email, 'not-a-real-password-rls-tests-never-check-this',
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(),
    '', '', '', ''
  )
  on conflict (id) do nothing;

  return user_id;
end;
$$;

select plan(10);

select tests.create_supabase_user('notif-a@rls-test.dev') as owner_a \gset
select tests.create_supabase_user('notif-b@rls-test.dev') as owner_b \gset
select tests.create_supabase_user('notif-admin@rls-test.dev') as admin_id \gset
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
