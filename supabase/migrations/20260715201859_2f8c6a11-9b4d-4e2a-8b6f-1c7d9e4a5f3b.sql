
-- Security fix: prevent owners from erasing claims/policy history by deleting
-- the parent asset. The "claims no update/delete" and "policies no
-- update/delete" RESTRICTIVE policies exist to keep an immutable audit
-- trail, but ON DELETE CASCADE from assets -> policies/claims let an owner
-- (who is allowed FOR ALL, including DELETE, on their own assets) bypass
-- those protections entirely by deleting the asset itself. Switch these
-- foreign keys to ON DELETE RESTRICT so an asset with any policy or claim
-- history cannot be deleted; it must be retired via a status change instead.

ALTER TABLE public.policies DROP CONSTRAINT policies_asset_id_fkey;
ALTER TABLE public.policies ADD CONSTRAINT policies_asset_id_fkey
  FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;

ALTER TABLE public.claims DROP CONSTRAINT claims_asset_id_fkey;
ALTER TABLE public.claims ADD CONSTRAINT claims_asset_id_fkey
  FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;

ALTER TABLE public.claims DROP CONSTRAINT claims_policy_id_fkey;
ALTER TABLE public.claims ADD CONSTRAINT claims_policy_id_fkey
  FOREIGN KEY (policy_id) REFERENCES public.policies(id) ON DELETE RESTRICT;
