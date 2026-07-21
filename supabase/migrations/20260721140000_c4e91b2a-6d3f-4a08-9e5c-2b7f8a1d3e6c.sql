
-- In-app notifications: claim/policy status changes and vital-sign alerts
-- create a notification row automatically via triggers, instead of relying
-- on client code to remember to write one (and possibly write a fake one).

CREATE TYPE notification_kind AS ENUM ('claim_status', 'policy_status', 'vital_alert');

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind notification_kind NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  related_asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  related_claim_id UUID REFERENCES public.claims(id) ON DELETE SET NULL,
  related_policy_id UUID REFERENCES public.policies(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);

CREATE POLICY "own notifications read" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own notifications mark read" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own notifications delete" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);
-- No INSERT policy for any client role: notifications are only ever
-- created by the trigger functions below (SECURITY DEFINER), never
-- written directly by a user or an admin.

-- Owners may only flip read_at; everything else about a notification is
-- fixed at creation time.
CREATE OR REPLACE FUNCTION public.guard_notification_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id <> OLD.user_id
     OR NEW.kind <> OLD.kind
     OR NEW.title <> OLD.title
     OR COALESCE(NEW.body, '') <> COALESCE(OLD.body, '')
     OR NEW.created_at <> OLD.created_at
     OR NEW.related_asset_id IS DISTINCT FROM OLD.related_asset_id
     OR NEW.related_claim_id IS DISTINCT FROM OLD.related_claim_id
     OR NEW.related_policy_id IS DISTINCT FROM OLD.related_policy_id THEN
    RAISE EXCEPTION 'Only read_at may be modified on notifications';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER notifications_owner_update_guard
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.guard_notification_update();

CREATE OR REPLACE FUNCTION public.notify_claim_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications
      (user_id, kind, title, body, related_asset_id, related_claim_id, related_policy_id)
    VALUES (
      NEW.owner_id,
      'claim_status',
      CASE NEW.status
        WHEN 'reviewing' THEN 'مطالبتك قيد المراجعة'
        WHEN 'approved' THEN 'تمت الموافقة على مطالبتك'
        WHEN 'rejected' THEN 'تم رفض مطالبتك'
        WHEN 'paid' THEN 'تم صرف مبلغ مطالبتك'
        ELSE 'تحديث على حالة مطالبتك'
      END,
      CASE
        WHEN NEW.status = 'approved' AND NEW.amount_approved IS NOT NULL
          THEN 'المبلغ المعتمد: ' || NEW.amount_approved || ' ريال'
        ELSE NULL
      END,
      NEW.asset_id,
      NEW.id,
      NEW.policy_id
    );
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER claims_notify_status_change
  AFTER UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.notify_claim_status_change();

CREATE OR REPLACE FUNCTION public.notify_policy_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications
      (user_id, kind, title, body, related_asset_id, related_policy_id)
    VALUES (
      NEW.owner_id,
      'policy_status',
      CASE NEW.status
        WHEN 'active' THEN 'تم تفعيل وثيقة التأمين'
        WHEN 'expired' THEN 'انتهت صلاحية وثيقة التأمين'
        WHEN 'cancelled' THEN 'تم إلغاء وثيقة التأمين'
        ELSE 'تحديث على حالة الوثيقة'
      END,
      NULL,
      NEW.asset_id,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER policies_notify_status_change
  AFTER UPDATE ON public.policies
  FOR EACH ROW EXECUTE FUNCTION public.notify_policy_status_change();

-- Placeholder healthy-range thresholds (not veterinary-reviewed): outside
-- these bounds is treated as worth flagging to the owner immediately.
CREATE OR REPLACE FUNCTION public.notify_vital_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  asset_name TEXT;
BEGIN
  IF (NEW.heart_rate IS NOT NULL AND (NEW.heart_rate < 20 OR NEW.heart_rate > 100))
     OR (NEW.temperature IS NOT NULL AND (NEW.temperature < 36 OR NEW.temperature > 40)) THEN
    SELECT name INTO asset_name FROM public.assets WHERE id = NEW.asset_id;
    INSERT INTO public.notifications (user_id, kind, title, body, related_asset_id)
    VALUES (
      NEW.owner_id,
      'vital_alert',
      'تنبيه صحي: ' || COALESCE(asset_name, 'أصل'),
      'نبض: ' || COALESCE(NEW.heart_rate::text, '—') || ' · حرارة: ' || COALESCE(NEW.temperature::text, '—'),
      NEW.asset_id
    );
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER vitals_notify_alert
  AFTER INSERT ON public.vitals
  FOR EACH ROW EXECUTE FUNCTION public.notify_vital_alert();

REVOKE EXECUTE ON FUNCTION public.guard_notification_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_claim_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_policy_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_vital_alert() FROM PUBLIC, anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
