-- RLS coverage for public.claims: owner scoping, the RESTRICTIVE
-- no-update/no-delete audit-trail policies, the admin bypass added on
-- top of them, and the guard trigger that limits what an admin update
-- may actually touch.
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

-- Fixtures (as postgres — bypasses RLS entirely).
select tests.create_supabase_user('owner-a@rls-test.dev') as owner_a \gset
select tests.create_supabase_user('owner-b@rls-test.dev') as owner_b \gset
select tests.create_supabase_user('owner-c@rls-test.dev') as owner_c \gset
select tests.create_supabase_user('admin@rls-test.dev') as admin_id \gset
insert into public.user_roles (user_id, role) values (:'admin_id', 'admin');

select gen_random_uuid() as asset_a \gset
insert into public.assets (id, owner_id, type, name, estimated_value)
  values (:'asset_a', :'owner_a', 'horse', 'Claim Test Horse', 500000);

select gen_random_uuid() as policy_a \gset
insert into public.policies (id, owner_id, asset_id, plan, monthly_price, coverage_amount, status)
  values (:'policy_a', :'owner_a', :'asset_a', 'hares', 490, 500000, 'active');

-- Act as owner A.
select set_config(
  'request.jwt.claims',
  json_build_object('sub', :'owner_a', 'role', 'authenticated')::text,
  true
);
set local role authenticated;

select gen_random_uuid() as claim_a \gset
select lives_ok(
  format(
    'insert into public.claims (id, owner_id, policy_id, asset_id, reason, amount_requested) values (%L, %L, %L, %L, %L, %L)',
    :'claim_a', :'owner_a', :'policy_a', :'asset_a', 'مرض', 15000
  ),
  'owner can submit a claim on their own policy'
);

select is(
  (select count(*) from public.claims where id = :'claim_a')::int,
  1,
  'owner can see their own claim'
);

select throws_ok(
  format(
    'insert into public.claims (owner_id, policy_id, asset_id, reason) values (%L, %L, %L, %L)',
    :'owner_b', :'policy_a', :'asset_a', 'محاولة انتحال'
  ),
  '42501',
  null,
  'owner cannot insert a claim tagged with someone else''s owner_id'
);

-- RESTRICTIVE policy silently filters the row out for UPDATE/DELETE —
-- no permissive policy exists for a non-admin owner on those commands,
-- so these are 0-row no-ops rather than thrown errors.
update public.claims set status = 'approved' where id = :'claim_a';
select is(
  (select status from public.claims where id = :'claim_a')::text,
  'submitted',
  'owner cannot change their own claim status'
);

delete from public.claims where id = :'claim_a';
select is(
  (select count(*) from public.claims where id = :'claim_a')::int,
  1,
  'owner cannot delete their own claim'
);

-- Act as owner B: a different owner with no relationship to this claim.
select set_config(
  'request.jwt.claims',
  json_build_object('sub', :'owner_b', 'role', 'authenticated')::text,
  true
);
select is_empty(
  format('select 1 from public.claims where id = %L', :'claim_a'),
  'a different owner cannot see this claim at all'
);

-- Act as admin.
select set_config(
  'request.jwt.claims',
  json_build_object('sub', :'admin_id', 'role', 'authenticated')::text,
  true
);
select is(
  (select count(*) from public.claims where id = :'claim_a')::int,
  1,
  'admin can see every claim, not just their own'
);

select lives_ok(
  format(
    'update public.claims set status = %L, amount_approved = %L where id = %L',
    'approved', 12000, :'claim_a'
  ),
  'admin can approve a claim and set the approved amount'
);

select results_eq(
  format('select status, amount_approved from public.claims where id = %L', :'claim_a'),
  $$ values ('approved'::claim_status, 12000::numeric) $$,
  'the approval actually took effect'
);

select throws_ok(
  format('update public.claims set reason = %L where id = %L', 'تلاعب', :'claim_a'),
  'P0001',
  null,
  'even an admin cannot rewrite the claim reason — only status/amount_approved are mutable'
);

delete from public.claims where id = :'claim_a';
select is(
  (select count(*) from public.claims where id = :'claim_a')::int,
  1,
  'nobody can delete a claim, not even an admin — it is a permanent audit record'
);

-- Act as an unrelated third owner.
select set_config(
  'request.jwt.claims',
  json_build_object('sub', :'owner_c', 'role', 'authenticated')::text,
  true
);
select is_empty(
  format('select 1 from public.claims where id = %L', :'claim_a'),
  'a completely unrelated, non-admin user cannot see the claim either'
);

select * from finish();
rollback;
