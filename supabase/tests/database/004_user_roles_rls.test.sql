-- The most security-critical table in the schema: public.user_roles has
-- no INSERT/UPDATE/DELETE policy for any client role at all, on purpose —
-- a role can only be granted via the SQL editor / service role, so a
-- user can never escalate their own privileges through the app. This
-- test pins that down directly, since a single accidental policy here
-- would reopen the exact admin-approval bypass the whole role system
-- exists to prevent.
begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

select gen_random_uuid() as owner_a \gset
select gen_random_uuid() as owner_b \gset
insert into auth.users (id, email) values
  (:'owner_a', 'roles-a@rls-test.dev'),
  (:'owner_b', 'roles-b@rls-test.dev');

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

select is(
  (with attempt as (
    update public.user_roles set role = 'admin' where user_id = :'owner_a' returning 1
  ) select count(*) from attempt)::int,
  0,
  'a user cannot update their own role row — no UPDATE policy exists for this table at all'
);

select is(
  (with attempt as (
    delete from public.user_roles where user_id = :'owner_a' returning 1
  ) select count(*) from attempt)::int,
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
