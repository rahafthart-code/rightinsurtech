-- Test-only fixtures. Runs once after migrations on every `supabase db
-- reset` / `supabase test db`, before any file under
-- supabase/tests/database/ executes — so the `tests` schema and this
-- function persist for all of them (unlike anything created inside a
-- test file's own begin/rollback block).

create schema if not exists tests;

-- A minimal-but-complete auth.users row. Real Supabase auth.users has
-- several NOT NULL columns (role, aud, the confirmation/recovery/email-
-- change token columns) with no safe default in every schema version —
-- inserting just (id, email) fails on those. No real password is set
-- since these tests never do a real login; they simulate the session via
-- request.jwt.claims directly, so encrypted_password is never checked.
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

revoke execute on function tests.create_supabase_user(text, uuid) from public, anon, authenticated;
