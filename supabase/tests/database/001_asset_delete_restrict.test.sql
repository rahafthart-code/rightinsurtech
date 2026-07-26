-- Regression test for the very first security fix this project shipped:
-- owners could delete their own asset to silently cascade-delete its
-- policies/claims (bypassing the "no update/delete" audit-trail
-- protection on those tables). Fixed by switching the relevant foreign
-- keys from ON DELETE CASCADE to ON DELETE RESTRICT.
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

select plan(4);

select tests.create_supabase_user('owner-001@rls-test.dev') as owner_id \gset

select gen_random_uuid() as insured_asset \gset
select gen_random_uuid() as bare_asset \gset
insert into public.assets (id, owner_id, type, name, estimated_value) values
  (:'insured_asset', :'owner_id', 'horse', 'Insured Horse', 500000),
  (:'bare_asset', :'owner_id', 'camel', 'Uninsured Camel', 200000);

select gen_random_uuid() as policy_id \gset
insert into public.policies (id, owner_id, asset_id, plan, monthly_price, coverage_amount, status)
  values (:'policy_id', :'owner_id', :'insured_asset', 'hares', 490, 500000, 'pending');

select set_config(
  'request.jwt.claims',
  json_build_object('sub', :'owner_id', 'role', 'authenticated')::text,
  true
);
set local role authenticated;

select throws_ok(
  format('delete from public.assets where id = %L', :'insured_asset'),
  '23503',
  null,
  'owner cannot delete an asset that has a policy (would silently cascade-erase it)'
);

select isnt_empty(
  format('select 1 from public.assets where id = %L', :'insured_asset'),
  'the insured asset is still there after the blocked delete'
);

select lives_ok(
  format('delete from public.assets where id = %L', :'bare_asset'),
  'owner can still delete an asset that was never insured'
);

select is_empty(
  format('select 1 from public.assets where id = %L', :'bare_asset'),
  'the uninsured asset is actually gone'
);

select * from finish();
rollback;
