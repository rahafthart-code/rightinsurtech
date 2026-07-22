-- Regression test for the very first security fix this project shipped:
-- owners could delete their own asset to silently cascade-delete its
-- policies/claims (bypassing the "no update/delete" audit-trail
-- protection on those tables). Fixed by switching the relevant foreign
-- keys from ON DELETE CASCADE to ON DELETE RESTRICT.
begin;
create extension if not exists pgtap with schema extensions;

select plan(4);

select gen_random_uuid() as owner_id \gset
insert into auth.users (id, email) values (:'owner_id', 'owner-001@rls-test.dev');

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
