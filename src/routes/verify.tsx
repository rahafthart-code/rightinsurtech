import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import logo from "@/assets/right-logo.png";

export const Route = createFileRoute("/verify")({
  component: VerifyPage,
  head: () => ({ meta: [{ title: "تحقق — Right" }] }),
});

const LEN = 6;

function VerifyPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(""));
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(45);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const p = sessionStorage.getItem("right_phone");
    if (!p) navigate({ to: "/login" });
    else setPhone(p);
  }, [navigate]);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const onChange = (i: number, v: string) => {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    if (d && i < LEN - 1) refs.current[i + 1]?.focus();
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const txt = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LEN);
    if (!txt) return;
    e.preventDefault();
    const next = Array(LEN).fill("");
    for (let i = 0; i < txt.length; i++) next[i] = txt[i];
    setDigits(next);
    refs.current[Math.min(txt.length, LEN - 1)]?.focus();
  };

  const code = digits.join("");
  const ready = code.length === LEN;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setLoading(true); setErr("");
    await new Promise((r) => setTimeout(r, 600));
    // TODO: verify OTP via server function (Lovable Cloud)
    if (code === "000000") {
      setErr("الرمز غير صحيح. حاول مرة أخرى.");
      setLoading(false);
      return;
    }
    sessionStorage.setItem("right_session", "1");
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-secondary px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-8 shadow-premium">
        <Link to="/login"><img src={logo} alt="Right" className="h-7" /></Link>

        <h1 className="mt-8 text-2xl font-black text-foreground">أدخل رمز التحقق</h1>
        <p className="mt-2 text-sm text-text-secondary">
          أرسلنا رمزاً مكوناً من 6 أرقام إلى <span dir="ltr" className="font-mono font-bold text-foreground">{phone}</span>
        </p>

        <form onSubmit={submit} className="mt-8">
          <div dir="ltr" className="flex justify-between gap-2" onPaste={onPaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { refs.current[i] = el; }}
                value={d}
                onChange={(e) => onChange(i, e.target.value)}
                onKeyDown={(e) => onKey(i, e)}
                inputMode="numeric"
                maxLength={1}
                autoFocus={i === 0}
                className="h-14 w-12 rounded-xl border border-border bg-bg-secondary text-center font-mono text-2xl font-bold text-foreground outline-none transition focus:border-gold focus:bg-surface focus:ring-2 focus:ring-gold/20"
              />
            ))}
          </div>

          {err && <p className="mt-3 text-center text-xs text-destructive">{err}</p>}

          <button
            type="submit"
            disabled={!ready || loading}
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-gradient-gold px-6 py-3.5 text-base font-bold text-primary-foreground shadow-gold transition hover:opacity-95 disabled:opacity-50"
          >
            {loading ? "جاري التحقق..." : "تأكيد الرمز"}
          </button>

          <div className="mt-6 flex items-center justify-between text-xs text-text-tertiary">
            <Link to="/login" className="text-foreground hover:underline">تغيير الرقم</Link>
            {seconds > 0 ? (
              <span>إعادة الإرسال خلال <span className="font-mono text-foreground">{seconds}</span> ثانية</span>
            ) : (
              <button type="button" onClick={() => setSeconds(45)} className="font-bold text-gold hover:underline">إعادة إرسال الرمز</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
