-- The most security-critical table in the schema: public.user_roles has
-- no INSERT/UPDATE/DELETE policy for any client role at all, on purpose —
-- a role can only be granted via the SQL editor / service role, so a
-- user can never escalate their own privileges through the app. This
-- test pins that down directly, since a single accidental policy here
-- would reopen the exact admin-approval bypass the whole role system
-- exists to prevent.
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

select plan(7);

select tests.create_supabase_user('roles-a@rls-test.dev') as owner_a \gset
select tests.create_supabase_user('roles-b@rls-test.dev') as owner_b \gset

select set_config(
  'request.jwt.claims',
  json_build_object('sub', :'owner_a', 'role', 'authenticated')::text,
  true
);
set local role authenticated;

select throws_ok(
  format('insert into public.user_roles (user_id, role) values (%L, %L)', :'owner_a', 'admin'),
  '42501',
  null,
  'a user cannot grant themselves the admin role — this is the actual privilege-escalation check'
);

select throws_ok(
  format('insert into public.user_roles (user_id, role) values (%L, %L)', :'owner_b', 'admin'),
  '42501',
  null,
  'nor can they grant a role to someone else'
);

-- Now legitimately grant owner_a admin the only way it's allowed to
-- happen: directly, bypassing RLS, as postgres.
reset role;
insert into public.user_roles (user_id, role) values (:'owner_a', 'admin');
set local role authenticated;

-- A data-modifying CTE (WITH ... UPDATE/DELETE ... RETURNING) can only
-- appear as a top-level statement in Postgres — it can't be nested as a
-- subquery inside is()'s argument list, so run it standalone and \gset
-- the result instead.
with attempt as (
  update public.user_roles set role = 'admin' where user_id = :'owner_a' returning 1
) select count(*) as update_attempt_count from attempt \gset

select is(
  :update_attempt_count::int,
  0,
  'a user cannot update their own role row — no UPDATE policy exists for this table at all'
);

with attempt as (
  delete from public.user_roles where user_id = :'owner_a' returning 1
) select count(*) as delete_attempt_count from attempt \gset

select is(
  :delete_attempt_count::int,
  0,
  'a user cannot delete their own role row either'
);

select is(
  (select count(*) from public.user_roles where user_id = :'owner_a')::int,
  1,
  'a user can read their own role assignment (the SELECT policy still works)'
);

select is_empty(
  format('select 1 from public.user_roles where user_id = %L', :'owner_b'),
  'a user cannot see someone else''s role row'
);

-- Confirm read access is per-user, not "any admin can see all roles".
reset role;
insert into public.user_roles (user_id, role) values (:'owner_b', 'admin');
select set_config(
  'request.jwt.claims',
  json_build_object('sub', :'owner_b', 'role', 'authenticated')::text,
  true
);
set local role authenticated;
select is(
  (select count(*) from public.user_roles where user_id = :'owner_a')::int,
  0,
  'owner_b, though also an admin, cannot see owner_a''s role row'
);

select * from finish();
rollback;
