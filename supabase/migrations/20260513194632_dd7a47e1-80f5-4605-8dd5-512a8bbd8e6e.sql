
DROP POLICY IF EXISTS "own claims all" ON public.claims;
CREATE POLICY "own claims read" ON public.claims
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "own claims insert" ON public.claims
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "own policies all" ON public.policies;
CREATE POLICY "own policies read" ON public.policies
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "own policies insert" ON public.policies
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Explicit restrictive deny for vitals UPDATE/DELETE so the intent is auditable.
CREATE POLICY "vitals no update" ON public.vitals
  AS RESTRICTIVE FOR UPDATE USING (false);
CREATE POLICY "vitals no delete" ON public.vitals
  AS RESTRICTIVE FOR DELETE USING (false);
