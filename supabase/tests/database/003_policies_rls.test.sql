-- RLS coverage for public.policies: mirrors 002_claims_rls.test.sql —
-- owner scoping, the RESTRICTIVE no-update/no-delete policies, the admin
-- bypass, and the guard trigger limiting an admin update to
-- status/end_date only.
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

select plan(12);

select tests.create_supabase_user('p-owner-a@rls-test.dev') as owner_a \gset
select tests.create_supabase_user('p-owner-b@rls-test.dev') as owner_b \gset
select tests.create_supabase_user('p-owner-c@rls-test.dev') as owner_c \gset
select tests.create_supabase_user('p-admin@rls-test.dev') as admin_id \gset
insert into public.user_roles (user_id, role) values (:'admin_id', 'admin');

select gen_random_uuid() as asset_a \gset
insert into public.assets (id, owner_id, type, name, estimated_value)
  values (:'asset_a', :'owner_a', 'camel', 'Policy Test Camel', 1200000);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', :'owner_a', 'role', 'authenticated')::text,
  true
);
set local role authenticated;

select gen_random_uuid() as policy_a \gset
select lives_ok(
  format(
    'insert into public.policies (id, owner_id, asset_id, plan, monthly_price, coverage_amount) values (%L, %L, %L, %L, %L, %L)',
    :'policy_a', :'owner_a', :'asset_a', 'raee', 790, 1500000
  ),
  'owner can create a (pending) policy on their own asset'
);

select is(
  (select count(*) from public.policies where id = :'policy_a')::int,
  1,
  'owner can see their own policy'
);

select throws_ok(
  format(
    'insert into public.policies (owner_id, asset_id, plan, monthly_price, coverage_amount) values (%L, %L, %L, %L, %L)',
    :'owner_b', :'asset_a', 'hares', 490, 500000
  ),
  '42501',
  null,
  'owner cannot insert a policy tagged with someone else''s owner_id'
);

update public.policies set status = 'active' where id = :'policy_a';
select is(
  (select status from public.policies where id = :'policy_a')::text,
  'pending',
  'owner cannot activate their own policy directly (must go through the checkout endpoint)'
);

delete from public.policies where id = :'policy_a';
select is(
  (select count(*) from public.policies where id = :'policy_a')::int,
  1,
  'owner cannot delete their own policy'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', :'owner_b', 'role', 'authenticated')::text,
  true
);
select is_empty(
  format('select 1 from public.policies where id = %L', :'policy_a'),
  'a different owner cannot see this policy at all'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', :'admin_id', 'role', 'authenticated')::text,
  true
);
select is(
  (select count(*) from public.policies where id = :'policy_a')::int,
  1,
  'admin can see every policy, not just their own'
);

select lives_ok(
  format('update public.policies set status = %L where id = %L', 'active', :'policy_a'),
  'admin can activate a pending policy'
);

select is(
  (select status from public.policies where id = :'policy_a')::text,
  'active',
  'the activation actually took effect'
);

select throws_ok(
  format('update public.policies set monthly_price = %L where id = %L', 999999, :'policy_a'),
  'P0001',
  null,
  'even an admin cannot rewrite the policy price — only status/end_date are mutable'
);

delete from public.policies where id = :'policy_a';
select is(
  (select count(*) from public.policies where id = :'policy_a')::int,
  1,
  'nobody can delete a policy, not even an admin'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', :'owner_c', 'role', 'authenticated')::text,
  true
);
select is_empty(
  format('select 1 from public.policies where id = %L', :'policy_a'),
  'a completely unrelated, non-admin user cannot see the policy either'
);

select * from finish();
rollback;
