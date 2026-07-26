import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({ meta: [{ title: "الشروط والأحكام — Right" }] }),
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-20 text-center">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/10">
          <FileText className="h-6 w-6 text-gold" />
        </div>
        <h1 className="mt-6 text-2xl font-black text-foreground">الشروط والأحكام</h1>
        <p className="mt-4 text-sm leading-relaxed text-text-secondary">
          النص الكامل للشروط والأحكام قيد الإعداد والمراجعة القانونية حالياً، ولم يُعتمد بعد. إذا
          كان لديك استفسار بخصوص شروط الاستخدام قبل اعتمادها رسمياً، يسعدنا تواصلك معنا مباشرة.
        </p>
        <a
          href="mailto:legal@right.sa"
          className="mt-6 inline-flex items-center justify-center rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-bold text-foreground transition hover:bg-bg-secondary"
        >
          راسلنا: legal@right.sa
        </a>
        <div className="mt-8">
          <Link to="/" className="text-sm text-gold hover:underline">
            العودة إلى الرئيسية
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
