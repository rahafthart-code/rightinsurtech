
-- Policies never actually expired: end_date exists on the table since
-- the very first migration, but nothing ever set it or acted on it, so
-- an active policy stayed "active" forever. This locks in a fixed
-- one-month coverage period, set automatically whenever a policy
-- transitions to active — regardless of whether that happens through
-- the checkout endpoint (service role) or an admin manually activating
-- it — rather than duplicating that logic at every call site.
--
-- Renewal isn't handled here: there's no recurring-charge mechanism
-- yet (Phase 1 checkout is a one-time mock payment). When a real
-- payment gateway is wired up, "renew" becomes pushing end_date forward
-- on a successful recurring charge — additive on top of this, not a
-- redesign of it.
CREATE OR REPLACE FUNCTION public.set_policy_end_date_on_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.status IS DISTINCT FROM 'active' THEN
    NEW.end_date := (now() + interval '1 month')::date;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER policies_set_end_date_on_activation
  BEFORE UPDATE ON public.policies
  FOR EACH ROW EXECUTE FUNCTION public.set_policy_end_date_on_activation();

REVOKE EXECUTE ON FUNCTION public.set_policy_end_date_on_activation() FROM PUBLIC, anon, authenticated;
