
-- Explicit restrictive UPDATE/DELETE blocks on claims
CREATE POLICY "claims no update" ON public.claims AS RESTRICTIVE FOR UPDATE USING (false);
CREATE POLICY "claims no delete" ON public.claims AS RESTRICTIVE FOR DELETE USING (false);

-- Explicit restrictive UPDATE/DELETE blocks on policies
CREATE POLICY "policies no update" ON public.policies AS RESTRICTIVE FOR UPDATE USING (false);
CREATE POLICY "policies no delete" ON public.policies AS RESTRICTIVE FOR DELETE USING (false);
