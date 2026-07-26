-- Coverage for the policy-expiry mechanism added this session:
-- activating a policy auto-sets a one-month end_date regardless of who
-- activates it, and run_policy_expiry_check() flips only the policies
-- that are actually past that date — leaving future-dated ones alone —
-- and reuses the existing policy-status notification trigger rather
-- than duplicating it.
begin;
create extension if not exists pgtap with schema extensions;

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

select plan(6);

select tests.create_supabase_user('expiry-owner@rls-test.dev') as owner_a \gset
select tests.create_supabase_user('expiry-admin@rls-test.dev') as admin_id \gset
insert into public.user_roles (user_id, role) values (:'admin_id', 'admin');

select gen_random_uuid() as asset_a \gset
insert into public.assets (id, owner_id, type, name, estimated_value)
  values (:'asset_a', :'owner_a', 'horse', 'Expiry Test Horse', 500000);

-- A pending policy, activated by the admin: end_date should be set
-- automatically, not left null or requiring the admin to supply one.
select gen_random_uuid() as policy_a \gset
insert into public.policies (id, owner_id, asset_id, plan, monthly_price, coverage_amount)
  values (:'policy_a', :'owner_a', :'asset_a', 'hares', 490, 500000);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', :'admin_id', 'role', 'authenticated')::text,
  true
);
set local role authenticated;

select lives_ok(
  format('update public.policies set status = %L where id = %L', 'active', :'policy_a'),
  'admin can activate a pending policy'
);

select is(
  (select end_date from public.policies where id = :'policy_a'),
  (now() + interval '1 month')::date,
  'activating the policy auto-set end_date to one month out'
);

reset role;

-- Two more policies, inserted already-active with explicit end_dates
-- (bypassing the activation trigger entirely, since it only fires on
-- UPDATE): one already past due, one comfortably in the future.
select gen_random_uuid() as asset_b \gset
insert into public.assets (id, owner_id, type, name, estimated_value)
  values (:'asset_b', :'owner_a', 'camel', 'Overdue Camel', 900000);
select gen_random_uuid() as policy_overdue \gset
insert into public.policies (id, owner_id, asset_id, plan, monthly_price, coverage_amount, status, end_date)
  values (:'policy_overdue', :'owner_a', :'asset_b', 'raee', 790, 1500000, 'active', current_date - 1);

select gen_random_uuid() as asset_c \gset
insert into public.assets (id, owner_id, type, name, estimated_value)
  values (:'asset_c', :'owner_a', 'falcon', 'Current Falcon', 300000);
select gen_random_uuid() as policy_current \gset
insert into public.policies (id, owner_id, asset_id, plan, monthly_price, coverage_amount, status, end_date)
  values (:'policy_current', :'owner_a', :'asset_c', 'hares', 490, 500000, 'active', current_date + 10);

select lives_ok('select public.run_policy_expiry_check()', 'the expiry check runs without error');

select is(
  (select status from public.policies where id = :'policy_overdue')::text,
  'expired',
  'the overdue policy was flipped to expired'
);

select is(
  (select status from public.policies where id = :'policy_current')::text,
  'active',
  'the not-yet-due policy was left alone'
);

select is(
  (select count(*) from public.notifications
     where related_policy_id = :'policy_overdue' and kind = 'policy_status'
       and title = 'انتهت صلاحية وثيقة التأمين')::int,
  1,
  'expiring the overdue policy raised the existing policy-status notification, not a new mechanism'
);

select * from finish();
rollback;
