import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Check, Crown, Star, Shield } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "الأسعار — Right" },
      { name: "description", content: "ثلاث باقات لحماية أصلك: حارس، راعي، وأمير. ابتداءً من 490 ريال شهرياً للحيوان الواحد." },
    ],
  }),
});

type Plan = {
  id: string;
  name: string;
  tag?: string;
  Icon: React.ElementType;
  price: number;
  blurb: string;
  features: string[];
  highlight?: boolean;
  premium?: boolean;
};

// مبدأ الترسيخ: نعرض "أمير" أولاً ليُجعل "راعي" يبدو عقلانياً
const PLANS: Plan[] = [
  {
    id: "amir",
    name: "أمير",
    tag: "النخبة",
    Icon: Crown,
    price: 1800,
    blurb: "للأصول النادرة والبطولات الكبرى — تغطية بدون سقف عملي.",
    premium: true,
    features: [
      "تغطية حتى 5,000,000 ريال للأصل",
      "بيطري خاص متاح 24/7",
      "تقارير مخبرية شهرية مفصّلة",
      "أولوية مطلقة في المطالبات (أقل من 24 ساعة)",
      "تأمين النقل الدولي للبطولات",
      "مدير حساب شخصي",
      "تأمين السمعة والقيمة السوقية",
    ],
  },
  {
    id: "raee",
    name: "راعي",
    tag: "الأكثر اختياراً",
    Icon: Star,
    price: 790,
    blurb: "التوازن الأمثل بين التغطية الشاملة والمراقبة الذكية.",
    highlight: true,
    features: [
      "تغطية حتى 1,500,000 ريال للأصل",
      "مراقبة لحظية + تنبؤ AI",
      "تنبيهات صحية ذكية",
      "تقارير شهرية تلقائية",
      "صرف المطالبات خلال 48 ساعة",
      "خط بيطري مباشر",
    ],
  },
  {
    id: "hares",
    name: "حارس",
    Icon: Shield,
    price: 490,
    blurb: "حماية أساسية موثوقة لأصل واحد — نقطة بداية مثالية.",
    features: [
      "تغطية حتى 500,000 ريال",
      "تقرير صحي ربع سنوي",
      "تغطية الحوادث والمرض",
      "صرف المطالبات خلال 7 أيام",
    ],
  },
];

function PricingPage() {
  const [yearly, setYearly] = useState(true);
  const factor = yearly ? 0.85 : 1;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="bg-gradient-hero pt-20 pb-12">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <div className="font-mono text-xs uppercase tracking-widest text-gold">الباقات</div>
            <h1 className="mt-4 text-4xl font-black text-foreground md:text-5xl">
              اختر مستوى الحماية الذي
              <span className="block text-gold">يليق بأصلك</span>
            </h1>
            <p className="mt-5 text-lg text-text-secondary">سعر شهري لكل حيوان — بدون التزامات سنوية. ألغِ في أي وقت.</p>

            <div className="mx-auto mt-8 inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1 shadow-premium">
              <button
                onClick={() => setYearly(false)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition ${!yearly ? "bg-foreground text-background" : "text-text-secondary"}`}
              >شهري</button>
              <button
                onClick={() => setYearly(true)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition ${yearly ? "bg-gradient-gold text-primary-foreground" : "text-text-secondary"}`}
              >سنوي · وفّر 15%</button>
            </div>
          </div>
        </section>

        <section className="px-6 pb-20">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
            {PLANS.map((p) => (
              <PlanCard key={p.id} plan={p} factor={factor} yearly={yearly} />
            ))}
          </div>

          <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-border bg-bg-secondary p-6 text-center text-sm text-text-secondary">
            جميع الباقات تشمل: تطبيق iOS و Android · دعم عربي 24/7 · ضمن البيئة التنظيمية التجريبية لهيئة التأمين · بدون رسوم خفية.
          </div>
        </section>

        <FAQ />
      </main>
      <SiteFooter />
    </div>
  );
}

function PlanCard({ plan, factor, yearly }: { plan: Plan; factor: number; yearly: boolean }) {
  const price = Math.round(plan.price * factor);
  const Icon = plan.Icon;

  if (plan.premium) {
    return (
      <article className="relative overflow-hidden rounded-3xl bg-gradient-dark p-8 text-white shadow-premium">
        <div className="absolute inset-0 bg-gradient-hero opacity-20" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-gold shadow-gold">
              <Icon className="h-5 w-5 text-primary-foreground" />
            </div>
            {plan.tag && <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gold">{plan.tag}</span>}
          </div>
          <h3 className="mt-6 text-2xl font-black text-gold-light">{plan.name}</h3>
          <p className="mt-2 text-sm text-white/70">{plan.blurb}</p>
          <div className="mt-6 flex items-baseline gap-2">
            <span className="text-5xl font-black text-white">{price.toLocaleString("ar-SA")}</span>
            <span className="text-sm text-white/60">ر.س / شهر</span>
          </div>
          {yearly && <div className="mt-1 text-xs text-gold">يُفوتر سنوياً · {(price * 12).toLocaleString("ar-SA")} ر.س</div>}
          <Link to="/login" className="mt-7 inline-flex w-full items-center justify-center rounded-lg bg-gradient-gold px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-gold transition hover:opacity-95">
            تواصل مع مدير الحساب
          </Link>
          <ul className="mt-7 space-y-3 border-t border-white/10 pt-6 text-sm">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-white/90">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </article>
    );
  }

  return (
    <article className={`relative rounded-3xl border bg-surface p-8 shadow-premium transition ${plan.highlight ? "border-gold ring-2 ring-gold/30 lg:-mt-4 lg:mb-0" : "border-border"}`}>
      {plan.tag && (
        <div className="absolute -top-3 right-1/2 translate-x-1/2 rounded-full bg-gradient-gold px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground shadow-gold">
          {plan.tag}
        </div>
      )}
      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${plan.highlight ? "bg-gradient-gold shadow-gold" : "bg-bg-secondary"}`}>
        <Icon className={`h-5 w-5 ${plan.highlight ? "text-primary-foreground" : "text-foreground"}`} />
      </div>
      <h3 className="mt-6 text-2xl font-black text-foreground">{plan.name}</h3>
      <p className="mt-2 text-sm text-text-secondary">{plan.blurb}</p>
      <div className="mt-6 flex items-baseline gap-2">
        <span className="text-5xl font-black text-foreground">{price.toLocaleString("ar-SA")}</span>
        <span className="text-sm text-text-tertiary">ر.س / شهر</span>
      </div>
      {yearly && <div className="mt-1 text-xs text-teal">يُفوتر سنوياً · {(price * 12).toLocaleString("ar-SA")} ر.س</div>}
      <Link
        to="/login"
        className={`mt-7 inline-flex w-full items-center justify-center rounded-lg px-6 py-3.5 text-sm font-bold transition ${plan.highlight ? "bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-95" : "border border-border bg-bg-secondary text-foreground hover:bg-bg-tertiary"}`}
      >
        ابدأ بـ {plan.name}
      </Link>
      <ul className="mt-7 space-y-3 border-t border-border pt-6 text-sm">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-foreground">
            <Check className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlight ? "text-gold" : "text-teal"}`} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function FAQ() {
  const items = [
    { q: "كيف يتم تقييم قيمة الأصل؟", a: "نعتمد على الشريحة، السلالة، السجل، وأسعار السوق الثانوي. النموذج يقترح قيمة وأنت تؤكد." },
    { q: "هل تشمل التغطية النفوق؟", a: "نعم، باقتا راعي وأمير تشملان النفوق الناتج عن المرض أو الحادث." },
    { q: "ما طرق الدفع المتاحة؟", a: "Apple Pay، مدى، STC Pay، وجميع البطاقات البنكية. الاشتراك يبدأ فور تأكيد الدفع." },
    { q: "هل يمكنني الإلغاء؟", a: "نعم في أي وقت من داخل التطبيق. لن يُجدّد الاشتراك تلقائياً بعد الإلغاء." },
  ];
  return (
    <section className="bg-bg-secondary py-20">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center text-3xl font-black text-foreground">الأسئلة الشائعة</h2>
        <div className="mt-10 space-y-3">
          {items.map((it) => (
            <details key={it.q} className="group rounded-xl border border-border bg-surface p-5 shadow-premium">
              <summary className="flex cursor-pointer items-center justify-between text-base font-bold text-foreground">
                {it.q}
                <span className="text-gold transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
