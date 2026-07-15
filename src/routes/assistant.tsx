import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import logo from "@/assets/right-logo.png";
import {
  ArrowRight,
  Send,
  Sparkles,
  Crown,
  Bird,
  Activity,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/assistant")({
  component: AssistantPage,
  head: () => ({ meta: [{ title: "وسام — مساعد بيطري ذكي · Right" }] }),
});

type Asset = { id: string; type: "horse" | "camel" | "falcon"; name: string; breed: string | null };
type Vital = {
  asset_id: string;
  heart_rate: number | null;
  temperature: number | null;
  recorded_at: string;
};
type Msg = { role: "user" | "assistant"; content: string };

const TYPE_LABEL: Record<Asset["type"], string> = { horse: "خيل", camel: "إبل", falcon: "صقر" };
const TYPE_ICON: Record<Asset["type"], React.ElementType> = {
  horse: Crown,
  camel: Activity,
  falcon: Bird,
};

const SUGGESTIONS = [
  "كيف أعرف أن فرسي يعاني من إجهاد حراري؟",
  "ما العلامات الطبيعية لنبض الإبل؟",
  "متى يجب فحص الصقر بعد رحلة طيران طويلة؟",
  "ما أفضل برنامج تغذية أسبوعي للخيل العربي؟",
];

function AssistantPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [vitals, setVitals] = useState<Record<string, Vital>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("assets")
        .select("id,type,name,breed")
        .order("created_at", { ascending: false });
      setAssets((data ?? []) as Asset[]);
      if (data && data.length) setSelectedId(data[0].id);
      const { data: v } = await supabase
        .from("vitals")
        .select("asset_id,heart_rate,temperature,recorded_at")
        .order("recorded_at", { ascending: false })
        .limit(50);
      const map: Record<string, Vital> = {};
      (v ?? []).forEach((row) => {
        if (!map[row.asset_id]) map[row.asset_id] = row as Vital;
      });
      setVitals(map);
    })();
  }, [user]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const selected = useMemo(
    () => assets.find((a) => a.id === selectedId) ?? null,
    [assets, selectedId],
  );
  const selectedVital = selectedId ? vitals[selectedId] : undefined;

  const buildContext = () => {
    if (!selected) return "";
    const v = selectedVital;
    return [
      `الاسم: ${selected.name}`,
      `النوع: ${TYPE_LABEL[selected.type]}`,
      selected.breed ? `السلالة: ${selected.breed}` : null,
      v?.heart_rate ? `آخر نبض: ${v.heart_rate} نبضة/د` : null,
      v?.temperature ? `آخر حرارة: ${v.temperature.toFixed(1)}°م` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  };

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || streaming) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setStreaming(true);
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: next, context: buildContext() }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "تعذر الاتصال بالمساعد." }));
        throw new Error(err.error || "خطأ غير متوقع");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch {
            /* ignore */
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "حدث خطأ أثناء الاتصال بالمساعد.";
      toast.error(msg);
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: `⚠️ ${msg}` };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg-secondary text-text-secondary">
        جاري التحميل…
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
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground hover:bg-bg-tertiary"
          >
            <ArrowRight className="h-4 w-4" /> لوحة التحكم
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-[320px_1fr]">
        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-gold/30 bg-gradient-dark p-5 text-white shadow-premium">
            <div className="inline-flex items-center gap-2 rounded-full bg-gold/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gold-light">
              <Sparkles className="h-3 w-3" /> AI · بيطري
            </div>
            <h2 className="mt-3 text-2xl font-black">وسام</h2>
            <p className="mt-1 text-sm text-white/70">
              مساعد ذكي يفهم سجلّ كل أصل عندك ويرد بالعربية.
            </p>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-white/60">
              <ShieldCheck className="h-3.5 w-3.5 text-teal" /> مخرجات استرشادية — لا تُغني عن
              الطبيب البيطري.
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4 shadow-premium">
            <div className="mb-3 text-xs font-bold uppercase tracking-widest text-text-tertiary">
              اربط الحوار بأصل
            </div>
            {assets.length === 0 ? (
              <Link
                to="/dashboard"
                className="block rounded-xl border border-dashed border-border bg-bg-secondary p-4 text-center text-sm text-text-secondary hover:bg-bg-tertiary"
              >
                لا توجد أصول — أضف أول أصل
              </Link>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedId(null)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition ${!selectedId ? "border-gold bg-gold/10 text-foreground" : "border-border bg-bg-secondary text-text-secondary hover:bg-bg-tertiary"}`}
                >
                  <span>سؤال عام (بدون سياق)</span>
                </button>
                {assets.map((a) => {
                  const Icon = TYPE_ICON[a.type];
                  const active = a.id === selectedId;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setSelectedId(a.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-right text-sm transition ${active ? "border-gold bg-gold/10 text-foreground" : "border-border bg-bg-secondary text-text-secondary hover:bg-bg-tertiary"}`}
                    >
                      <Icon className={`h-4 w-4 ${active ? "text-gold" : "text-text-tertiary"}`} />
                      <div className="flex-1">
                        <div className="font-bold text-foreground">{a.name}</div>
                        <div className="text-[11px] text-text-tertiary">
                          {TYPE_LABEL[a.type]}
                          {a.breed ? ` · ${a.breed}` : ""}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Chat */}
        <section className="flex h-[calc(100vh-160px)] min-h-[560px] flex-col rounded-3xl border border-border bg-surface shadow-premium">
          <div ref={scrollerRef} className="flex-1 overflow-y-auto px-6 py-6">
            {messages.length === 0 ? (
              <div className="mx-auto max-w-2xl py-10 text-center">
                <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-gold shadow-gold">
                  <Sparkles className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="mt-5 text-2xl font-black text-foreground">كيف أقدر أساعدك اليوم؟</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  {selected ? (
                    <>
                      سياق الحوار:{" "}
                      <span className="font-bold text-foreground">{selected.name}</span> ·{" "}
                      {TYPE_LABEL[selected.type]}
                    </>
                  ) : (
                    "اختر أحد أصولك من القائمة لإجابات أدق."
                  )}
                </p>
                <div className="mx-auto mt-8 grid max-w-xl grid-cols-1 gap-2 text-right md:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-xl border border-border bg-bg-secondary p-3 text-sm text-text-secondary transition hover:border-gold/40 hover:bg-bg-tertiary hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-5">
                {messages.map((m, i) => (
                  <Bubble
                    key={i}
                    role={m.role}
                    content={m.content}
                    loading={streaming && i === messages.length - 1 && !m.content}
                  />
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="border-t border-border bg-bg-secondary/60 p-4"
          >
            <div className="mx-auto flex max-w-3xl items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder={selected ? `اسأل وسام عن ${selected.name}…` : "اكتب سؤالك البيطري…"}
                className="max-h-40 flex-1 resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-base text-foreground outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
              />
              <button
                type="submit"
                disabled={!input.trim() || streaming}
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-gold text-primary-foreground shadow-gold transition hover:opacity-95 disabled:opacity-50"
              >
                {streaming ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
            <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-text-tertiary">
              مخرجات وسام استرشادية. للحالات الحرجة اتصل بالطبيب البيطري فوراً.
            </p>
          </form>
        </section>
      </main>
    </div>
  );
}

function Bubble({
  role,
  content,
  loading,
}: {
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-sm ${
          isUser
            ? "bg-gradient-gold text-primary-foreground"
            : "border border-border bg-bg-secondary text-foreground"
        }`}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2 text-text-tertiary">
            <Loader2 className="h-4 w-4 animate-spin" /> يفكر وسام…
          </span>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
