import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Shield, Activity, Sparkles, FileCheck, Phone, Zap, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Right — تأمين وحماية الخيل والإبل والصقور" },
      {
        name: "description",
        content:
          "أول منصة سعودية لتأمين الأصول التراثية الثمينة. مراقبة لحظية، تنبيهات صحية بـ AI، ودفع فوري عبر Apple Pay.",
      },
    ],
  }),
});

function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <TrustBar />
        <Features />
        <HowItWorks />
        <SocialProof />
        <FinalCTA />
      </main>
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero">
      <div className="mx-auto max-w-7xl px-6 pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium text-text-secondary shadow-premium">
            <span className="h-1.5 w-1.5 rounded-full bg-teal" />
            ضمن البيئة التنظيمية التجريبية لهيئة التأمين
          </div>
          <h1 className="mt-6 text-4xl font-black leading-[1.15] text-foreground md:text-6xl">
            أصولك التراثية تستحق
            <span className="mt-2 block bg-gradient-gold bg-clip-text text-transparent">
              حماية بمستوى قيمتها
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-text-secondary md:text-xl">
            Right هي أول منصة رقمية في المملكة لتأمين الخيل والإبل والصقور — مراقبة صحية لحظية،
            تنبيهات ذكية، وتغطية فورية.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-gold px-7 py-3.5 text-base font-bold text-primary-foreground shadow-gold transition hover:opacity-95 active:scale-[0.98] sm:w-auto"
            >
              ابدأ التأمين خلال 60 ثانية
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex w-full items-center justify-center rounded-lg border border-border bg-surface px-7 py-3.5 text-base font-semibold text-foreground transition hover:bg-bg-secondary active:scale-[0.98] sm:w-auto"
            >
              شاهد الباقات
            </Link>
          </div>
          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-text-tertiary">
            <span>✓ بدون مراجعات بنكية</span>
            <span>✓ Apple Pay</span>
            <span>✓ تغطية فورية</span>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl grid-cols-3 gap-4">
          {[
            { ar: "خيل", en: "Equine", val: "850K" },
            { ar: "إبل", en: "Camelids", val: "1.2M" },
            { ar: "صقور", en: "Falcons", val: "320K" },
          ].map((c) => (
            <div
              key={c.en}
              className="rounded-2xl border border-border bg-surface p-6 text-center shadow-premium"
            >
              <div className="font-mono text-xs uppercase tracking-widest text-text-tertiary">
                {c.en}
              </div>
              <div className="mt-2 text-2xl font-black text-foreground">{c.ar}</div>
              <div className="mt-1 text-xs text-text-secondary">
                متوسط القيمة <span className="text-gold font-mono font-bold">{c.val} ر.س</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustBar() {
  return (
    <section className="border-y border-border bg-bg-secondary py-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-12 gap-y-4 px-6 text-sm text-text-tertiary">
        <span>هيئة التأمين — البيئة التجريبية</span>
        <span>·</span>
        <span>الاتحاد السعودي للفروسية</span>
        <span>·</span>
        <span>نادي الصقور السعودي</span>
        <span>·</span>
        <span>مهرجان الملك عبدالعزيز للإبل</span>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    {
      icon: Shield,
      title: "تغطية شاملة",
      desc: "ضد المرض، الإصابة، النفوق، والسرقة. تعويض حتى 1.5 مليون ريال للأصل الواحد.",
    },
    {
      icon: Activity,
      title: "مراقبة لحظية",
      desc: "حساس ذكي يربط الصحة بالحركة والنبض، يُحلَّل بـ AI ويُرسَل لك في الوقت المناسب.",
    },
    {
      icon: Sparkles,
      title: "تنبؤ ذكي",
      desc: "نموذج Right AI يكتشف المؤشرات المبكرة قبل أيام من ظهور الأعراض.",
    },
    {
      icon: FileCheck,
      title: "سجل رقمي موثّق",
      desc: "كل فحص وعلاج مسجّل ومؤرشف — يرفع قيمة أصلك في السوق الثانوي.",
    },
    {
      icon: Phone,
      title: "بيطري عند الطلب",
      desc: "تواصل مباشر مع شبكة بيطريين معتمدين خلال دقائق، 24/7.",
    },
    {
      icon: Zap,
      title: "مطالبات في 48 ساعة",
      desc: "صرف التعويض بدون أوراق — كل شيء داخل التطبيق.",
    },
  ];
  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="font-mono text-xs uppercase tracking-widest text-gold">المزايا</div>
          <h2 className="mt-3 text-3xl font-black text-foreground md:text-4xl">
            حماية تليق بـ <span className="text-gold">قيمة</span> أصلك
          </h2>
          <p className="mt-4 text-text-secondary">
            مزجنا التغطية التأمينية الكلاسيكية بتقنيات الذكاء الاصطناعي ومراقبة المستشعرات لنقدم
            تجربة لم تكن موجودة من قبل.
          </p>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <div
              key={it.title}
              className="group rounded-2xl border border-border bg-surface p-7 shadow-premium transition hover:-translate-y-1 hover:shadow-gold"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-gold shadow-gold">
                <it.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-foreground">{it.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", t: "سجّل برقم جوالك", d: "دخول فوري عبر OTP — بدون كلمات مرور أو مستندات." },
    { n: "02", t: "أضف أصولك", d: "صورة، شريحة، ووصف بسيط. النظام يقدّر القيمة تلقائياً." },
    { n: "03", t: "اختر الباقة وادفع", d: "Apple Pay أو مدى. الحماية تبدأ فور تأكيد الدفع." },
  ];
  return (
    <section id="how" className="bg-bg-secondary py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="font-mono text-xs uppercase tracking-widest text-teal">الخطوات</div>
          <h2 className="mt-3 text-3xl font-black text-foreground md:text-4xl">
            من التسجيل إلى الحماية في <span className="text-teal">دقيقة</span>
          </h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="relative rounded-2xl border border-border bg-surface p-8 shadow-premium"
            >
              <div className="font-mono text-5xl font-black text-gold-pale">{s.n}</div>
              <h3 className="mt-4 text-xl font-bold text-foreground">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SocialProof() {
  return (
    <section className="py-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 md:grid-cols-3">
        {[
          {
            q: "وثقت 14 خيلاً عندي في Right — السجل ساعدني أبيع مهرين بسعر أعلى من السوق.",
            a: "أبو فيصل",
            r: "مربّي خيل عربي · القصيم",
          },
          {
            q: "التنبيه وصلني قبل ما البيطري يكتشف الالتهاب بثلاثة أيام. الناقة تستاهل كل ريال.",
            a: "م. خالد",
            r: "مالك إبل وضح · الرياض",
          },
          {
            q: "لأول مرة أحس إن في جهة فاهمة قيمة الصقر. التعويض وصل خلال يومين.",
            a: "سعد الـ.",
            r: "صقّار · حائل",
          },
        ].map((t) => (
          <figure
            key={t.a}
            className="rounded-2xl border border-border bg-surface p-7 shadow-premium"
          >
            <div className="text-3xl text-gold leading-none">"</div>
            <blockquote className="mt-2 text-base leading-relaxed text-foreground">
              {t.q}
            </blockquote>
            <figcaption className="mt-5 border-t border-border pt-4">
              <div className="text-sm font-bold text-foreground">{t.a}</div>
              <div className="text-xs text-text-tertiary">{t.r}</div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="px-6 pb-24">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-dark p-12 text-center md:p-16">
        <h2 className="text-3xl font-black text-white md:text-5xl">احمِ ما لا يُعوّض</h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-white/70 md:text-lg">
          انضم لمئات الملاك الذين يثقون بRight في حماية أغلى ما يملكون.
        </p>
        <Link
          to="/login"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-gold px-8 py-4 text-base font-bold text-primary-foreground shadow-gold transition hover:opacity-95 active:scale-[0.98]"
        >
          ابدأ الآن — أول 14 يوم مجاناً
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
