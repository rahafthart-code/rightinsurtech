-- RLS coverage for public.claims: owner scoping, the RESTRICTIVE
-- no-update/no-delete audit-trail policies, the admin bypass added on
-- top of them, and the guard trigger that limits what an admin update
-- may actually touch.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

-- Fixtures (as postgres — bypasses RLS entirely).
select gen_random_uuid() as owner_a \gset
select gen_random_uuid() as owner_b \gset
select gen_random_uuid() as owner_c \gset
select gen_random_uuid() as admin_id \gset
insert into auth.users (id, email) values
  (:'owner_a', 'owner-a@rls-test.dev'),
  (:'owner_b', 'owner-b@rls-test.dev'),
  (:'owner_c', 'owner-c@rls-test.dev'),
  (:'admin_id', 'admin@rls-test.dev');
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
