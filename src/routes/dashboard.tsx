import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import logo from "@/assets/right-logo.png";
import { LogOut, Plus, Activity, MapPin, Heart, Thermometer, Crown, Bird, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "لوحة التحكم — Right" }] }),
});

type Asset = {
  id: string;
  type: "horse" | "camel" | "falcon";
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
  recorded_at: string;
};

const TYPE_LABEL: Record<Asset["type"], string> = { horse: "خيل", camel: "إبل", falcon: "صقر" };
const TYPE_ICON: Record<Asset["type"], React.ElementType> = { horse: Crown, camel: Activity, falcon: Bird };

function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [vitalsMap, setVitalsMap] = useState<Record<string, Vital>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  const loadAssets = async () => {
    const { data, error } = await supabase.from("assets").select("*").order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setAssets((data ?? []) as Asset[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    loadAssets();

    // Realtime: vitals
    const channel = supabase
      .channel("vitals-stream")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "vitals" }, (payload) => {
        const v = payload.new as Vital;
        setVitalsMap((prev) => ({ ...prev, [v.asset_id]: v }));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "assets" }, () => loadAssets())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    return <div className="grid min-h-screen place-items-center bg-bg-secondary text-text-secondary">جاري التحميل…</div>;
  }

  const totalValue = assets.reduce((s, a) => s + Number(a.estimated_value || 0), 0);

  return (
    <div className="min-h-screen bg-bg-secondary">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2"><img src={logo} alt="Right" className="h-7" /></Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-text-secondary md:inline">{user.phone ?? user.email}</span>
            <button onClick={logout} className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground hover:bg-bg-tertiary">
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
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-5 py-3 text-sm font-bold text-primary-foreground shadow-gold hover:opacity-95">
            <Plus className="h-4 w-4" /> إضافة أصل
          </button>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard label="إجمالي الأصول" value={`${assets.length}`} hint="أصل مسجّل" />
          <StatCard label="القيمة الإجمالية" value={`${totalValue.toLocaleString("ar-SA")} ر.س`} hint="تقدير المالك" accent />
          <StatCard label="حالة المراقبة" value={Object.keys(vitalsMap).length > 0 ? "نشطة" : "بانتظار البيانات"} hint="آخر 60 ثانية" />
        </div>

        {/* Assets grid */}
        <div className="mt-8">
          {loading ? (
            <div className="text-text-secondary">جاري تحميل الأصول…</div>
          ) : assets.length === 0 ? (
            <EmptyState onAdd={() => setShowAdd(true)} />
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {assets.map((a) => (
                <AssetCard key={a.id} asset={a} vital={vitalsMap[a.id]} onPing={() => simulateVital(a)} />
              ))}
            </div>
          )}
        </div>
      </main>

      {showAdd && <AddAssetModal onClose={() => setShowAdd(false)} onSaved={loadAssets} userId={user.id} />}
    </div>
  );
}

function StatCard({ label, value, hint, accent }: { label: string; value: string; hint: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-premium ${accent ? "border-gold/30 bg-gradient-dark text-white" : "border-border bg-surface"}`}>
      <div className={`text-xs ${accent ? "text-gold-light" : "text-text-tertiary"}`}>{label}</div>
      <div className={`mt-2 text-3xl font-black ${accent ? "text-white" : "text-foreground"}`}>{value}</div>
      <div className={`mt-1 text-xs ${accent ? "text-white/60" : "text-text-tertiary"}`}>{hint}</div>
    </div>
  );
}

function AssetCard({ asset, vital, onPing }: { asset: Asset; vital?: Vital; onPing: () => void }) {
  const Icon = TYPE_ICON[asset.type];
  return (
    <article className="rounded-2xl border border-border bg-surface p-5 shadow-premium">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-gold shadow-gold">
            <Icon className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">{asset.name}</h3>
            <div className="text-xs text-text-tertiary">{TYPE_LABEL[asset.type]}{asset.breed ? ` · ${asset.breed}` : ""}</div>
          </div>
        </div>
        <span className="rounded-full bg-teal/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-teal">محمي</span>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-bg-secondary p-3">
        <div className="text-[11px] text-text-tertiary">القيمة المؤمّن عليها</div>
        <div className="mt-1 text-xl font-black text-foreground">{Number(asset.estimated_value).toLocaleString("ar-SA")} <span className="text-xs font-medium text-text-tertiary">ر.س</span></div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Vitals icon={Heart} label="نبض" value={vital?.heart_rate ? `${vital.heart_rate}` : "—"} />
        <Vitals icon={Thermometer} label="حرارة" value={vital?.temperature ? `${vital.temperature.toFixed(1)}°` : "—"} />
        <Vitals icon={MapPin} label="موقع" value={vital?.lat ? "حيّ" : "—"} live={!!vital?.lat} />
      </div>

      <button onClick={onPing} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-xs font-medium text-text-secondary hover:bg-bg-tertiary">
        <Activity className="h-3.5 w-3.5" /> محاكاة نبضة (تجريبي)
      </button>
    </article>
  );
}

function Vitals({ icon: Icon, label, value, live }: { icon: React.ElementType; label: string; value: string; live?: boolean }) {
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
      <p className="mt-2 text-sm text-text-secondary">ابدأ بإضافة أول أصل لك (خيل، إبل، أو صقر) وابدأ المراقبة الذكية.</p>
      <button onClick={onAdd} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-5 py-3 text-sm font-bold text-primary-foreground shadow-gold hover:opacity-95">
        <Plus className="h-4 w-4" /> أضف أصلك الأول
      </button>
    </div>
  );
}

function AddAssetModal({ onClose, onSaved, userId }: { onClose: () => void; onSaved: () => void; userId: string }) {
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
      type, name: name.trim(),
      breed: breed.trim() || null,
      estimated_value: Number(value),
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تمت إضافة الأصل بنجاح");
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl border border-border bg-surface p-6 shadow-premium" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-black text-foreground">إضافة أصل جديد</h2>
        <p className="mt-1 text-sm text-text-secondary">سجّل بيانات أصلك للحصول على حماية فورية.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">نوع الأصل</label>
            <div className="grid grid-cols-3 gap-2">
              {(["horse", "camel", "falcon"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${type === t ? "border-gold bg-gold/10 text-foreground" : "border-border bg-bg-secondary text-text-secondary"}`}>
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          <Field label="الاسم" required>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2.5 text-foreground outline-none focus:border-gold focus:ring-2 focus:ring-gold/20" placeholder="مثال: شعلة" />
          </Field>

          <Field label="السلالة">
            <input value={breed} onChange={(e) => setBreed(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2.5 text-foreground outline-none focus:border-gold focus:ring-2 focus:ring-gold/20" placeholder="مثال: عربي أصيل" />
          </Field>

          <Field label="القيمة التقديرية (ر.س)" required>
            <input dir="ltr" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2.5 text-right font-mono text-foreground outline-none focus:border-gold focus:ring-2 focus:ring-gold/20" placeholder="500000" />
          </Field>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border bg-bg-secondary px-4 py-3 text-sm font-bold text-foreground">إلغاء</button>
            <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-gradient-gold px-4 py-3 text-sm font-bold text-primary-foreground shadow-gold disabled:opacity-50">
              {saving ? "جاري الحفظ…" : "حفظ الأصل"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-foreground">{label}{required && <span className="text-destructive"> *</span>}</span>
      {children}
    </label>
  );
}
