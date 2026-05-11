import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import logo from "@/assets/right-logo.png";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "دخول — Right" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const valid = /^5\d{8}$/.test(phone);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) { setErr("الرجاء إدخال رقم جوال سعودي صحيح يبدأ بـ 5"); return; }
    setErr(""); setLoading(true);
    const fullPhone = `+966${phone}`;
    const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
    setLoading(false);
    if (error) {
      setErr(error.message.includes("provider") || error.message.includes("SMS")
        ? "خدمة الرسائل غير مفعّلة بعد على الحساب. يرجى تفعيل مزود SMS من إعدادات Cloud."
        : error.message);
      return;
    }
    sessionStorage.setItem("right_phone", fullPhone);
    navigate({ to: "/verify" });
  };

  return (
    <div className="min-h-screen bg-bg-secondary">
      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-2">
        {/* Form side */}
        <div className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <Link to="/" className="inline-flex items-center gap-2"><img src={logo} alt="Right" className="h-7" /></Link>
            <h1 className="mt-10 text-3xl font-black text-foreground">أهلاً بك في Right</h1>
            <p className="mt-2 text-sm text-text-secondary">سجّل برقم جوالك — سنرسل لك رمز تحقق فوري.</p>

            <form onSubmit={submit} className="mt-8 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">رقم الجوال</span>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 shadow-premium focus-within:border-gold focus-within:ring-2 focus-within:ring-gold/20">
                  <span dir="ltr" className="font-mono text-sm text-text-tertiary">+966</span>
                  <input
                    dir="ltr"
                    inputMode="numeric"
                    placeholder="5XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
                    className="flex-1 bg-transparent font-mono text-base outline-none placeholder:text-text-tertiary/60"
                    autoFocus
                  />
                </div>
                {err && <span className="mt-2 block text-xs text-destructive">{err}</span>}
              </label>

              <button
                type="submit"
                disabled={!valid || loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-gold px-6 py-3.5 text-base font-bold text-primary-foreground shadow-gold transition hover:opacity-95 disabled:opacity-50"
              >
                {loading ? "جاري الإرسال..." : "إرسال الرمز"}
                <ArrowLeft className="h-4 w-4" />
              </button>

              <p className="text-center text-xs text-text-tertiary">
                بمتابعتك توافق على <a href="#" className="text-foreground underline">الشروط</a> و<a href="#" className="text-foreground underline">سياسة الخصوصية</a>.
              </p>
            </form>

            <div className="mt-10 flex items-center justify-center gap-2 text-xs text-text-tertiary">
              <ShieldCheck className="h-4 w-4 text-teal" />
              <span>تشفير بنكي · ضمن البيئة التنظيمية التجريبية لهيئة التأمين</span>
            </div>
          </div>
        </div>

        {/* Brand side */}
        <div className="relative hidden overflow-hidden bg-gradient-dark lg:block">
          <div className="absolute inset-0 bg-gradient-hero opacity-30" />
          <div className="relative flex h-full flex-col justify-between p-12 text-white">
            <div className="font-mono text-sm tracking-widest text-gold">Right · Right</div>
            <div>
              <div className="text-3xl font-black leading-snug">
                "وثقت 14 خيلاً عندي في Right — السجل ساعدني أبيع مهرين بسعر أعلى من السوق."
              </div>
              <div className="mt-6 text-sm text-white/70">— أبو فيصل · مربّي خيل عربي · القصيم</div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center text-xs text-white/70">
              <div><div className="text-2xl font-black text-gold-light">+1,200</div>أصل محمي</div>
              <div><div className="text-2xl font-black text-gold-light">48س</div>متوسط المطالبة</div>
              <div><div className="text-2xl font-black text-gold-light">99.2%</div>رضا الملاك</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
