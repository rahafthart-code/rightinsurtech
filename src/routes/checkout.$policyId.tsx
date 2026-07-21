import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PLAN_INFO, type PlanId } from "@/lib/plans";
import logo from "@/assets/right-logo.png";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout/$policyId")({
  component: CheckoutPage,
  head: () => ({ meta: [{ title: "الدفع — Right" }] }),
});

type AssetType = "horse" | "camel" | "falcon";
const ASSET_TYPE_LABEL: Record<AssetType, string> = { horse: "خيل", camel: "إبل", falcon: "صقر" };

type PolicyRow = {
  id: string;
  plan: PlanId;
  monthly_price: number;
  coverage_amount: number;
  status: "active" | "pending" | "expired" | "cancelled";
  assets: { name: string; type: AssetType } | null;
};

function CheckoutPage() {
  const { policyId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [policy, setPolicy] = useState<PolicyRow | null | undefined>(undefined);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("policies")
      .select("id, plan, monthly_price, coverage_amount, status, assets(name, type)")
      .eq("id", policyId)
      .maybeSingle()
      .then(({ data }) => setPolicy((data as unknown as PolicyRow) ?? null));
  }, [user, policyId]);

  const pay = async () => {
    setPaying(true);
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    try {
      const res = await fetch("/api/checkout/pay", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ policyId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "تعذّر إتمام الدفع.");
        return;
      }
      setPaid(true);
      toast.success("تم تفعيل وثيقة التأمين");
    } finally {
      setPaying(false);
    }
  };

  if (authLoading || !user || policy === undefined) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg-secondary text-text-secondary">
        جاري التحميل…
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg-secondary px-6 text-center">
        <div>
          <h1 className="text-2xl font-black text-foreground">لم يتم العثور على الوثيقة</h1>
          <Link
            to="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-5 py-3 text-sm font-bold text-primary-foreground shadow-gold"
          >
            العودة إلى لوحتك
          </Link>
        </div>
      </div>
    );
  }

  const info = PLAN_INFO[policy.plan];
  const alreadyActive = policy.status !== "pending" && !paid;

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-secondary px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-8 shadow-premium">
        <Link to="/dashboard">
          <img src={logo} alt="Right" className="h-7" />
        </Link>

        {paid || alreadyActive ? (
          <div className="mt-8 text-center">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-teal/10">
              <CheckCircle2 className="h-7 w-7 text-teal" />
            </div>
            <h1 className="mt-5 text-xl font-black text-foreground">
              {paid ? "تم تفعيل وثيقة التأمين" : "هذه الوثيقة مُفعّلة بالفعل"}
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              {policy.assets?.name} مؤمّن الآن ضمن باقة {info.name}.
            </p>
            <Link
              to="/dashboard"
              className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-gradient-gold px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-gold"
            >
              الذهاب إلى لوحتك
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mt-8 text-2xl font-black text-foreground">إتمام الدفع</h1>
            <p className="mt-2 text-sm text-text-secondary">راجع بيانات وثيقتك قبل التفعيل.</p>

            <div className="mt-6 rounded-2xl border border-border bg-bg-secondary p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-tertiary">الأصل</span>
                <span className="font-bold text-foreground">
                  {policy.assets
                    ? `${ASSET_TYPE_LABEL[policy.assets.type]} · ${policy.assets.name}`
                    : "—"}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-text-tertiary">الباقة</span>
                <span className="font-bold text-foreground">{info.name}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-text-tertiary">التغطية</span>
                <span className="font-bold text-foreground">
                  {Number(policy.coverage_amount).toLocaleString("ar-SA")} ر.س
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <span className="text-text-tertiary">الاشتراك الشهري</span>
                <span className="text-xl font-black text-foreground">
                  {Number(policy.monthly_price).toLocaleString("ar-SA")}{" "}
                  <span className="text-xs font-medium text-text-tertiary">ر.س</span>
                </span>
              </div>
            </div>

            <button
              onClick={pay}
              disabled={paying}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-gold px-6 py-3.5 text-base font-bold text-primary-foreground shadow-gold transition hover:opacity-95 disabled:opacity-50"
            >
              {paying ? "جاري معالجة الدفع…" : "ادفع الآن"}
            </button>

            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-text-tertiary">
              <ShieldCheck className="h-4 w-4 text-teal" />
              <span>وضع تجريبي — لا يتم خصم أي مبلغ فعلي.</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
