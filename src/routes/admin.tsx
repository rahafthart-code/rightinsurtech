import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Skeleton } from "@/components/ui/skeleton";
import logo from "@/assets/right-logo.png";
import { LogOut, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "لوحة الإدارة — Right" }] }),
});

type ClaimStatus = "submitted" | "reviewing" | "approved" | "rejected" | "paid";
type PolicyStatus = "active" | "pending" | "expired" | "cancelled";
type AssetType = "horse" | "camel" | "falcon";

type Claim = {
  id: string;
  owner_id: string;
  policy_id: string;
  asset_id: string;
  reason: string;
  description: string | null;
  amount_requested: number | null;
  amount_approved: number | null;
  status: ClaimStatus;
  created_at: string;
  assets: { name: string; type: AssetType } | null;
};

type Policy = {
  id: string;
  owner_id: string;
  asset_id: string;
  plan: "hares" | "raee" | "amir";
  monthly_price: number;
  coverage_amount: number;
  status: PolicyStatus;
  start_date: string;
  end_date: string | null;
  assets: { name: string; type: AssetType } | null;
};

const ASSET_TYPE_LABEL: Record<AssetType, string> = { horse: "خيل", camel: "إبل", falcon: "صقر" };
const PLAN_LABEL: Record<Policy["plan"], string> = { hares: "حارس", raee: "راعي", amir: "أمير" };
const CLAIM_STATUSES: ClaimStatus[] = ["submitted", "reviewing", "approved", "rejected", "paid"];
const POLICY_STATUSES: PolicyStatus[] = ["active", "pending", "expired", "cancelled"];
const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  submitted: "مُقدَّمة",
  reviewing: "قيد المراجعة",
  approved: "موافَق عليها",
  rejected: "مرفوضة",
  paid: "مصروفة",
};
const POLICY_STATUS_LABEL: Record<PolicyStatus, string> = {
  active: "سارية",
  pending: "بانتظار التفعيل",
  expired: "منتهية",
  cancelled: "ملغاة",
};

function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, checking: checkingRole } = useIsAdmin(user);
  const navigate = useNavigate();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  const loadData = async () => {
    const [claimsRes, policiesRes] = await Promise.all([
      supabase
        .from("claims")
        .select("*, assets(name, type)")
        .order("created_at", { ascending: false }),
      supabase
        .from("policies")
        .select("*, assets(name, type)")
        .order("created_at", { ascending: false }),
    ]);
    if (claimsRes.error) toast.error(claimsRes.error.message);
    else setClaims((claimsRes.data ?? []) as unknown as Claim[]);
    if (policiesRes.error) toast.error(policiesRes.error.message);
    else setPolicies((policiesRes.data ?? []) as unknown as Policy[]);
    setLoadingData(false);
  };

  useEffect(() => {
    if (!user || !isAdmin) return;
    loadData();
  }, [user, isAdmin]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  if (authLoading || !user || checkingRole) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg-secondary">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg-secondary px-6 text-center">
        <div>
          <h1 className="text-2xl font-black text-foreground">هذه الصفحة للإدارة فقط</h1>
          <p className="mt-2 text-sm text-text-secondary">
            لا تملك صلاحية الوصول إلى لوحة الإدارة.
          </p>
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

  return (
    <div className="min-h-screen bg-bg-secondary">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Right" className="h-7" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-sm font-bold text-foreground">
              <ShieldCheck className="h-4 w-4 text-gold" /> لوحة الإدارة
            </span>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground hover:bg-bg-tertiary"
            >
              <LogOut className="h-4 w-4" /> خروج
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="font-mono text-xs uppercase tracking-widest text-gold">إدارة</div>
        <h1 className="mt-2 text-3xl font-black text-foreground">المطالبات ووثائق التأمين</h1>

        {loadingData ? (
          <div className="mt-8 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        ) : (
          <>
            <section className="mt-8">
              <h2 className="text-lg font-bold text-foreground">
                المطالبات <span className="text-text-tertiary">({claims.length})</span>
              </h2>
              {claims.length === 0 ? (
                <p className="mt-3 text-sm text-text-secondary">لا توجد مطالبات بعد.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {claims.map((c) => (
                    <ClaimRow key={c.id} claim={c} onSaved={loadData} />
                  ))}
                </div>
              )}
            </section>

            <section className="mt-12">
              <h2 className="text-lg font-bold text-foreground">
                وثائق التأمين <span className="text-text-tertiary">({policies.length})</span>
              </h2>
              {policies.length === 0 ? (
                <p className="mt-3 text-sm text-text-secondary">لا توجد وثائق بعد.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {policies.map((p) => (
                    <PolicyRow key={p.id} policy={p} onSaved={loadData} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-premium">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="mt-4 flex gap-3 border-t border-border pt-4">
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
    </div>
  );
}

function ClaimRow({ claim, onSaved }: { claim: Claim; onSaved: () => void }) {
  const [status, setStatus] = useState<ClaimStatus>(claim.status);
  const [amountApproved, setAmountApproved] = useState<string>(
    claim.amount_approved != null ? String(claim.amount_approved) : "",
  );
  const [saving, setSaving] = useState(false);

  const dirty =
    status !== claim.status ||
    amountApproved !== (claim.amount_approved != null ? String(claim.amount_approved) : "");

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("claims")
      .update({
        status,
        amount_approved: amountApproved ? Number(amountApproved) : null,
      })
      .eq("id", claim.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم تحديث المطالبة");
    onSaved();
  };

  return (
    <article className="rounded-2xl border border-border bg-surface p-5 shadow-premium">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-foreground">
            {claim.assets
              ? `${ASSET_TYPE_LABEL[claim.assets.type]} · ${claim.assets.name}`
              : "أصل محذوف"}
          </div>
          <div className="mt-1 text-xs text-text-tertiary">{claim.reason}</div>
          {claim.description && (
            <p className="mt-2 max-w-xl text-xs text-text-secondary">{claim.description}</p>
          )}
          <div className="mt-2 text-[11px] text-text-tertiary">
            المبلغ المطلوب:{" "}
            {claim.amount_requested != null
              ? `${Number(claim.amount_requested).toLocaleString("ar-SA")} ر.س`
              : "—"}
          </div>
        </div>
        <span className="rounded-full bg-teal/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-teal">
          {CLAIM_STATUS_LABEL[claim.status]}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-foreground">الحالة</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ClaimStatus)}
            className="rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
          >
            {CLAIM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CLAIM_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-foreground">
            المبلغ المعتمد (ر.س)
          </span>
          <input
            dir="ltr"
            inputMode="numeric"
            value={amountApproved}
            onChange={(e) => setAmountApproved(e.target.value.replace(/\D/g, ""))}
            className="w-40 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-right font-mono text-sm text-foreground outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
            placeholder="0"
          />
        </label>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="rounded-lg bg-gradient-gold px-4 py-2 text-sm font-bold text-primary-foreground shadow-gold transition hover:opacity-95 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100"
        >
          {saving ? "جاري الحفظ…" : "حفظ"}
        </button>
      </div>
    </article>
  );
}

function PolicyRow({ policy, onSaved }: { policy: Policy; onSaved: () => void }) {
  const [status, setStatus] = useState<PolicyStatus>(policy.status);
  const [saving, setSaving] = useState(false);

  const dirty = status !== policy.status;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("policies").update({ status }).eq("id", policy.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم تحديث الوثيقة");
    onSaved();
  };

  return (
    <article className="rounded-2xl border border-border bg-surface p-5 shadow-premium">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-foreground">
            {policy.assets
              ? `${ASSET_TYPE_LABEL[policy.assets.type]} · ${policy.assets.name}`
              : "أصل محذوف"}
          </div>
          <div className="mt-1 text-xs text-text-tertiary">
            باقة {PLAN_LABEL[policy.plan]} · {Number(policy.monthly_price).toLocaleString("ar-SA")}{" "}
            ر.س/شهرياً
          </div>
          <div className="mt-2 text-[11px] text-text-tertiary">
            تغطية حتى {Number(policy.coverage_amount).toLocaleString("ar-SA")} ر.س
          </div>
        </div>
        <span className="rounded-full bg-teal/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-teal">
          {POLICY_STATUS_LABEL[policy.status]}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-foreground">الحالة</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as PolicyStatus)}
            className="rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
          >
            {POLICY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {POLICY_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="rounded-lg bg-gradient-gold px-4 py-2 text-sm font-bold text-primary-foreground shadow-gold transition hover:opacity-95 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100"
        >
          {saving ? "جاري الحفظ…" : "حفظ"}
        </button>
      </div>
    </article>
  );
}
