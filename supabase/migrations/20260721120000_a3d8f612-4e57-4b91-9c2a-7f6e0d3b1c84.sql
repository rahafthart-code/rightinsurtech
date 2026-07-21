
-- Admin/staff role system + claim & policy approval workflow.
--
-- Roles live in their own table (not a column on profiles) so that a user
-- can never grant themselves a role through the "own profile update" policy.
-- No INSERT/UPDATE/DELETE policy is defined for user_roles at all, so roles
-- can only be granted via the Supabase SQL editor / service role — never
-- from the client.

CREATE TYPE app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- SECURITY DEFINER so it can read user_roles from inside claims/policies RLS
-- policies without needing those policies to grant access to user_roles
-- directly (and without risking RLS recursion).
CREATE OR REPLACE FUNCTION public.current_user_has_role(_role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = _role
  );
$$;

-- Admins can see every claim/policy (owners already see only their own via
-- the existing "own claims read" / "own policies read" policies).
CREATE POLICY "admin claims read all" ON public.claims
  FOR SELECT USING (public.current_user_has_role('admin'));
CREATE POLICY "admin policies read all" ON public.policies
  FOR SELECT USING (public.current_user_has_role('admin'));

-- Allow admins to update claims/policies. The RESTRICTIVE "no update"
-- policies added earlier block ALL updates unconditionally, so they must be
-- relaxed to admit an admin; a matching PERMISSIVE policy is required too
-- since there was previously no permissive UPDATE policy at all.
DROP POLICY "claims no update" ON public.claims;
CREATE POLICY "claims no update" ON public.claims
  AS RESTRICTIVE FOR UPDATE USING (public.current_user_has_role('admin'));
CREATE POLICY "admin claims update" ON public.claims
  FOR UPDATE USING (public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('admin'));

DROP POLICY "policies no update" ON public.policies;
CREATE POLICY "policies no update" ON public.policies
  AS RESTRICTIVE FOR UPDATE USING (public.current_user_has_role('admin'));
CREATE POLICY "admin policies update" ON public.policies
  FOR UPDATE USING (public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('admin'));

-- DELETE stays blocked for everyone, including admins: claims/policies are
-- an audit trail, so a rejected claim is recorded, never erased.

-- Column-level guard: even an admin can only change status/amount_approved
-- on a claim, and status/end_date on a policy. Everything else (owner,
-- amounts requested, reason, dates of record) stays immutable. RLS
-- WITH CHECK alone can't compare old vs. new values, so this needs a
-- trigger.
CREATE OR REPLACE FUNCTION public.guard_claim_admin_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id <> OLD.owner_id
     OR NEW.policy_id <> OLD.policy_id
     OR NEW.asset_id <> OLD.asset_id
     OR NEW.reason <> OLD.reason
     OR NEW.amount_requested IS DISTINCT FROM OLD.amount_requested
     OR COALESCE(NEW.description, '') <> COALESCE(OLD.description, '')
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Only status and amount_approved may be modified on claims';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER claims_admin_update_guard
  BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.guard_claim_admin_update();

CREATE OR REPLACE FUNCTION public.guard_policy_admin_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id <> OLD.owner_id
     OR NEW.asset_id <> OLD.asset_id
     OR NEW.plan <> OLD.plan
     OR NEW.monthly_price <> OLD.monthly_price
     OR NEW.coverage_amount <> OLD.coverage_amount
     OR NEW.start_date <> OLD.start_date
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Only status and end_date may be modified on policies';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER policies_admin_update_guard
  BEFORE UPDATE ON public.policies
  FOR EACH ROW EXECUTE FUNCTION public.guard_policy_admin_update();

REVOKE EXECUTE ON FUNCTION public.guard_claim_admin_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_policy_admin_update() FROM PUBLIC, anon, authenticated;
