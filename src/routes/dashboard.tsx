import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { NotificationBell } from "@/components/notification-bell";
import { Skeleton } from "@/components/ui/skeleton";
import { PLAN_INFO, PLAN_IDS, type PlanId } from "@/lib/plans";
import {
  ASSET_TYPE_LABEL,
  CLAIM_STATUS_LABEL,
  POLICY_STATUS_LABEL,
  type AssetType,
  type ClaimStatus,
  type PolicyStatus,
} from "@/lib/labels";
import { isOffline } from "@/lib/iot-watchdog-logic";
import logo from "@/assets/right-logo.png";
import {
  LogOut,
  Plus,
  Activity,
  MapPin,
  Heart,
  Thermometer,
  Crown,
  Bird,
  Sparkles,
  ShieldCheck,
  Umbrella,
  Loader2,
  FileText,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "لوحة التحكم — Right" }] }),
});

type Asset = {
  id: string;
  type: AssetType;
  name: string;
  breed: string | null;
  estimated_value: number;
  image_url: string | null;
  created_at: string;
};

type Vital = {
  asset_id: string;
  heart_rate: number | null;
  temperature: number | null;
  lat: number | null;
  lng: number | null;
  battery_level: number | null;
  recorded_at: string;
};

type AssetPolicy = { id: string; plan: PlanId; status: PolicyStatus };

type MyClaim = {
  id: string;
  reason: string;
  description: string | null;
  amount_requested: number | null;
  amount_approved: number | null;
  status: ClaimStatus;
  created_at: string;
  assets: { name: string; type: AssetType } | null;
};

const TYPE_ICON: Record<AssetType, React.ElementType> = {
  horse: Crown,
  camel: Activity,
  falcon: Bird,
};

function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useIsAdmin(user);
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [vitalsMap, setVitalsMap] = useState<Record<string, Vital>>({});
  const [policiesMap, setPoliciesMap] = useState<Record<string, AssetPolicy>>({});
  const [claims, setClaims] = useState<MyClaim[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [insureAsset, setInsureAsset] = useState<Asset | null>(null);
  const [claimTarget, setClaimTarget] = useState<{ asset: Asset; policyId: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  const loadAssets = async () => {
    const { data, error } = await supabase
      .from("assets")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    setAssets((data ?? []) as Asset[]);
    setLoading(false);
  };

  const loadPolicies = async () => {
    const { data, error } = await supabase
      .from("policies")
      .select("id, asset_id, plan, status")
      .order("created_at", { ascending: false });
    if (error) return;
    const map: Record<string, AssetPolicy> = {};
    for (const p of data ?? []) {
      // Newest policy per asset wins (query is already newest-first).
      if (!map[p.asset_id]) map[p.asset_id] = { id: p.id, plan: p.plan, status: p.status };
    }
    setPoliciesMap(map);
  };

  const loadClaims = async () => {
    const { data } = await supabase
      .from("claims")
      .select(
        "id, reason, description, amount_requested, amount_approved, status, created_at, assets(name, type)",
      )
      .order("created_at", { ascending: false });
    setClaims((data ?? []) as unknown as MyClaim[]);
  };

  const loadVitals = async () => {
    const { data } = await supabase
      .from("vitals")
      .select("asset_id, heart_rate, temperature, lat, lng, battery_level, recorded_at")
      .order("recorded_at", { ascending: false });
    if (!data) return;
    const map: Record<string, Vital> = {};
    for (const v of data) {
      // Newest reading per asset wins (query is already newest-first).
      if (!map[v.asset_id]) map[v.asset_id] = v as Vital;
    }
    setVitalsMap(map);
  };

  useEffect(() => {
    if (!user) return;
    loadAssets();
    loadPolicies();
    loadClaims();
    loadVitals();

    // Realtime: vitals
    const channel = supabase
      .channel("vitals-stream")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "vitals" }, (payload) => {
        const v = payload.new as Vital;
        setVitalsMap((prev) => ({ ...prev, [v.asset_id]: v }));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "assets" }, () => loadAssets())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  // Demo: simulate a vital ping for first asset
  const simulateVital = async (asset: Asset) => {
    if (!user) return;
    const { error } = await supabase.from("vitals").insert({
      asset_id: asset.id,
      owner_id: user.id,
      heart_rate: 30 + Math.floor(Math.random() * 20),
      temperature: 37.5 + Math.random(),
      lat: 24.7 + Math.random() * 0.1,
      lng: 46.6 + Math.random() * 0.1,
    });
    if (error) toast.error(error.message);
  };

  if (authLoading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg-secondary">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  const totalValue = assets.reduce((s, a) => s + Number(a.estimated_value || 0), 0);

  return (
    <div className="min-h-screen bg-bg-secondary">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Right" className="h-7" />
          </Link>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-bold text-foreground hover:bg-bg-tertiary"
              >
                <ShieldCheck className="h-4 w-4 text-gold" /> الإدارة
              </Link>
            )}
            <Link
              to="/assistant"
              className="inline-flex items-center gap-2 rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-sm font-bold text-foreground hover:bg-gold/15"
            >
              <Sparkles className="h-4 w-4 text-gold" /> وسام
            </Link>
            <span className="hidden text-xs text-text-secondary md:inline">
              {user.phone ?? user.email}
            </span>
            <NotificationBell userId={user.id} />
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
        <div className="flex items-end justify-between">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-gold">لوحة التحكم</div>
            <h1 className="mt-2 text-3xl font-black text-foreground">أصولك المحمية</h1>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-5 py-3 text-sm font-bold text-primary-foreground shadow-gold transition hover:opacity-95 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> إضافة أصل
          </button>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard label="إجمالي الأصول" value={`${assets.length}`} hint="أصل مسجّل" />
          <StatCard
            label="القيمة الإجمالية"
            value={`${totalValue.toLocaleString("ar-SA")} ر.س`}
            hint="تقدير المالك"
            accent
          />
          <StatCard
            label="حالة المراقبة"
            value={Object.keys(vitalsMap).length > 0 ? "نشطة" : "بانتظار البيانات"}
            hint="آخر 60 ثانية"
          />
        </div>

        {/* Assets grid */}
        <div className="mt-8">
          {loading ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <AssetCardSkeleton key={i} />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <EmptyState onAdd={() => setShowAdd(true)} />
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {assets.map((a) => (
                <AssetCard
                  key={a.id}
                  asset={a}
                  vital={vitalsMap[a.id]}
                  policy={policiesMap[a.id]}
                  onPing={() => simulateVital(a)}
                  onInsure={() => setInsureAsset(a)}
                  onClaim={() => {
                    const policy = policiesMap[a.id];
                    if (policy) setClaimTarget({ asset: a, policyId: policy.id });
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Claims */}
        {!loading && (
          <div className="mt-10">
            <h2 className="text-lg font-bold text-foreground">
              مطالباتي <span className="text-text-tertiary">({claims.length})</span>
            </h2>
            {claims.length === 0 ? (
              <p className="mt-3 text-sm text-text-secondary">لا توجد مطالبات مقدَّمة بعد.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {claims.map((c) => (
                  <MyClaimRow key={c.id} claim={c} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {showAdd && (
        <AddAssetModal onClose={() => setShowAdd(false)} onSaved={loadAssets} userId={user.id} />
      )}

      {insureAsset && (
        <InsureAssetModal
          asset={insureAsset}
          userId={user.id}
          onClose={() => setInsureAsset(null)}
          onCreated={(policyId) => navigate({ to: "/checkout/$policyId", params: { policyId } })}
        />
      )}

      {claimTarget && (
        <ClaimModal
          asset={claimTarget.asset}
          policyId={claimTarget.policyId}
          userId={user.id}
          onClose={() => setClaimTarget(null)}
          onSaved={loadClaims}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-premium ${accent ? "border-gold/30 bg-gradient-dark text-white" : "border-border bg-surface"}`}
    >
      <div className={`text-xs ${accent ? "text-gold-light" : "text-text-tertiary"}`}>{label}</div>
      <div className={`mt-2 text-3xl font-black ${accent ? "text-white" : "text-foreground"}`}>
        {value}
      </div>
      <div className={`mt-1 text-xs ${accent ? "text-white/60" : "text-text-tertiary"}`}>
        {hint}
      </div>
    </div>
  );
}

function AssetCard({
  asset,
  vital,
  policy,
  onPing,
  onInsure,
  onClaim,
}: {
  asset: Asset;
  vital?: Vital;
  policy?: AssetPolicy;
  onPing: () => void;
  onInsure: () => void;
  onClaim: () => void;
}) {
  const Icon = TYPE_ICON[asset.type];
  return (
    <article className="rounded-2xl border border-border bg-surface p-5 shadow-premium transition hover:-translate-y-1 hover:shadow-xl">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-gold shadow-gold">
            <Icon className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">{asset.name}</h3>
            <div className="text-xs text-text-tertiary">
              {ASSET_TYPE_LABEL[asset.type]}
              {asset.breed ? ` · ${asset.breed}` : ""}
            </div>
          </div>
        </div>
        {policy && (policy.status === "active" || policy.status === "pending") ? (
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${policy.status === "active" ? "bg-teal/10 text-teal" : "bg-gold/10 text-gold"}`}
          >
            {POLICY_STATUS_LABEL[policy.status]} · {PLAN_INFO[policy.plan].name}
          </span>
        ) : (
          <span className="rounded-full bg-bg-tertiary px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
            غير مؤمّن
          </span>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-border bg-bg-secondary p-3">
        <div className="text-[11px] text-text-tertiary">القيمة المؤمّن عليها</div>
        <div className="mt-1 text-xl font-black text-foreground">
          {Number(asset.estimated_value).toLocaleString("ar-SA")}{" "}
          <span className="text-xs font-medium text-text-tertiary">ر.س</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Vitals icon={Heart} label="نبض" value={vital?.heart_rate ? `${vital.heart_rate}` : "—"} />
        <Vitals
          icon={Thermometer}
          label="حرارة"
          value={vital?.temperature ? `${vital.temperature.toFixed(1)}°` : "—"}
        />
        <Vitals icon={MapPin} label="موقع" value={vital?.lat ? "حيّ" : "—"} live={!!vital?.lat} />
      </div>

      {policy?.status === "active" && isOffline(vital?.recorded_at ?? null) && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-[11px] font-medium text-destructive">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          جهاز المراقبة لم يُبلّغ منذ فترة — نراقب الوضع تلقائياً.
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={onPing}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-xs font-medium text-text-secondary transition hover:bg-bg-tertiary active:scale-[0.97]"
        >
          <Activity className="h-3.5 w-3.5" /> محاكاة نبضة (تجريبي)
        </button>
        {policy?.status === "active" ? (
          <button
            onClick={onClaim}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-gold px-3 py-2 text-xs font-bold text-primary-foreground shadow-gold transition hover:opacity-95 active:scale-[0.97]"
          >
            <FileText className="h-3.5 w-3.5" /> تقديم مطالبة
          </button>
        ) : (
          (!policy || policy.status === "expired" || policy.status === "cancelled") && (
            <button
              onClick={onInsure}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-gold px-3 py-2 text-xs font-bold text-primary-foreground shadow-gold transition hover:opacity-95 active:scale-[0.97]"
            >
              <Umbrella className="h-3.5 w-3.5" /> أمّن هذا الأصل
            </button>
          )
        )}
      </div>
    </article>
  );
}

function AssetCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-premium">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-16 w-full rounded-xl" />
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
      </div>
      <Skeleton className="mt-4 h-9 w-full rounded-lg" />
    </div>
  );
}

function MyClaimRow({ claim }: { claim: MyClaim }) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-4 shadow-premium">
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
        </div>
        <span className="rounded-full bg-teal/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-teal">
          {CLAIM_STATUS_LABEL[claim.status]}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 border-t border-border pt-3 text-[11px] text-text-tertiary">
        <span>
          المبلغ المطلوب:{" "}
          {claim.amount_requested != null
            ? `${Number(claim.amount_requested).toLocaleString("ar-SA")} ر.س`
            : "—"}
        </span>
        {claim.amount_approved != null && (
          <span className="font-bold text-gold">
            المبلغ المعتمد: {Number(claim.amount_approved).toLocaleString("ar-SA")} ر.س
          </span>
        )}
      </div>
    </article>
  );
}

function Vitals({
  icon: Icon,
  label,
  value,
  live,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  live?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-bg-secondary p-2">
      <div className="flex items-center justify-center gap-1 text-[10px] text-text-tertiary">
        <Icon className={`h-3 w-3 ${live ? "text-teal" : ""}`} /> {label}
      </div>
      <div className="mt-0.5 font-mono text-sm font-bold text-foreground">{value}</div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-surface p-12 text-center">
      <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-gold shadow-gold">
        <Crown className="h-7 w-7 text-primary-foreground" />
      </div>
      <h3 className="mt-5 text-xl font-black text-foreground">لا توجد أصول بعد</h3>
      <p className="mt-2 text-sm text-text-secondary">
        ابدأ بإضافة أول أصل لك (خيل، إبل، أو صقر) وابدأ المراقبة الذكية.
      </p>
      <button
        onClick={onAdd}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-5 py-3 text-sm font-bold text-primary-foreground shadow-gold hover:opacity-95"
      >
        <Plus className="h-4 w-4" /> أضف أصلك الأول
      </button>
    </div>
  );
}

function AddAssetModal({
  onClose,
  onSaved,
  userId,
}: {
  onClose: () => void;
  onSaved: () => void;
  userId: string;
}) {
  const [type, setType] = useState<Asset["type"]>("horse");
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [value, setValue] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !value) return;
    setSaving(true);
    const { error } = await supabase.from("assets").insert({
      owner_id: userId,
      type,
      name: name.trim(),
      breed: breed.trim() || null,
      estimated_value: Number(value),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تمت إضافة الأصل بنجاح");
    onSaved();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-border bg-surface p-6 shadow-premium"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-black text-foreground">إضافة أصل جديد</h2>
        <p className="mt-1 text-sm text-text-secondary">سجّل بيانات أصلك للحصول على حماية فورية.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">نوع الأصل</label>
            <div className="grid grid-cols-3 gap-2">
              {(["horse", "camel", "falcon"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${type === t ? "border-gold bg-gold/10 text-foreground" : "border-border bg-bg-secondary text-text-secondary"}`}
                >
                  {ASSET_TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          <Field label="الاسم" required>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2.5 text-foreground outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
              placeholder="مثال: شعلة"
            />
          </Field>

          <Field label="السلالة">
            <input
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2.5 text-foreground outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
              placeholder="مثال: عربي أصيل"
            />
          </Field>

          <Field label="القيمة التقديرية (ر.س)" required>
            <input
              dir="ltr"
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2.5 text-right font-mono text-foreground outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
              placeholder="500000"
            />
          </Field>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border bg-bg-secondary px-4 py-3 text-sm font-bold text-foreground"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-gradient-gold px-4 py-3 text-sm font-bold text-primary-foreground shadow-gold disabled:opacity-50"
            >
              {saving ? "جاري الحفظ…" : "حفظ الأصل"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InsureAssetModal({
  asset,
  userId,
  onClose,
  onCreated,
}: {
  asset: Asset;
  userId: string;
  onClose: () => void;
  onCreated: (policyId: string) => void;
}) {
  const [plan, setPlan] = useState<PlanId>("raee");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const info = PLAN_INFO[plan];
    const { data, error } = await supabase
      .from("policies")
      .insert({
        owner_id: userId,
        asset_id: asset.id,
        plan,
        monthly_price: info.monthlyPrice,
        coverage_amount: info.coverageAmount,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error(error?.message ?? "تعذّر إنشاء الوثيقة.");
      return;
    }
    onCreated(data.id);
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-border bg-surface p-6 shadow-premium"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-black text-foreground">تأمين {asset.name}</h2>
        <p className="mt-1 text-sm text-text-secondary">اختر الباقة المناسبة، ثم أكمل الدفع.</p>

        <div className="mt-6 space-y-3">
          {PLAN_IDS.map((id) => {
            const info = PLAN_INFO[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => setPlan(id)}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-right transition ${plan === id ? "border-gold bg-gold/10" : "border-border bg-bg-secondary"}`}
              >
                <div>
                  <div className="text-sm font-bold text-foreground">{info.name}</div>
                  <div className="text-xs text-text-tertiary">
                    تغطية حتى {info.coverageAmount.toLocaleString("ar-SA")} ر.س
                  </div>
                </div>
                <div className="text-sm font-black text-foreground">
                  {info.monthlyPrice.toLocaleString("ar-SA")}{" "}
                  <span className="text-xs font-medium text-text-tertiary">ر.س/شهر</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border bg-bg-secondary px-4 py-3 text-sm font-bold text-foreground"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="flex-1 rounded-xl bg-gradient-gold px-4 py-3 text-sm font-bold text-primary-foreground shadow-gold disabled:opacity-50"
          >
            {saving ? "جاري الإنشاء…" : "متابعة إلى الدفع"}
          </button>
        </div>
      </div>
    </div>
  );
}

const CLAIM_REASONS = ["مرض", "إصابة", "وفاة", "سرقة", "أخرى"];

function ClaimModal({
  asset,
  policyId,
  userId,
  onClose,
  onSaved,
}: {
  asset: Asset;
  policyId: string;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [reason, setReason] = useState(CLAIM_REASONS[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("claims").insert({
      owner_id: userId,
      policy_id: policyId,
      asset_id: asset.id,
      reason,
      description: description.trim() || null,
      amount_requested: amount ? Number(amount) : null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم إرسال المطالبة");
    onSaved();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-border bg-surface p-6 shadow-premium"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-black text-foreground">تقديم مطالبة — {asset.name}</h2>
        <p className="mt-1 text-sm text-text-secondary">صف الحالة وسنراجعها في أقرب وقت.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="سبب المطالبة" required>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2.5 text-foreground outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
            >
              {CLAIM_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>

          <Field label="تفاصيل إضافية">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2.5 text-foreground outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
              placeholder="اشرح ما حدث..."
            />
          </Field>

          <Field label="المبلغ المطلوب (ر.س)">
            <input
              dir="ltr"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2.5 text-right font-mono text-foreground outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
              placeholder="0"
            />
          </Field>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border bg-bg-secondary px-4 py-3 text-sm font-bold text-foreground"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-gradient-gold px-4 py-3 text-sm font-bold text-primary-foreground shadow-gold transition hover:opacity-95 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            >
              {saving ? "جاري الإرسال…" : "إرسال المطالبة"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {children}
    </label>
  );
}
