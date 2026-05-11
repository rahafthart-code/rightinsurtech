export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-bg-secondary">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-4">
        <div>
          <div className="font-mono text-lg font-bold text-gold">Right · Right</div>
          <p className="mt-3 text-sm text-text-secondary leading-relaxed">منصة تأمين وحماية رقمية للأصول الثمينة — الخيل، الإبل، والصقور.</p>
        </div>
        <div>
          <div className="mb-3 text-xs font-bold uppercase tracking-widest text-text-tertiary">المنتج</div>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li>الأسعار</li><li>المزايا</li><li>التطبيق</li>
          </ul>
        </div>
        <div>
          <div className="mb-3 text-xs font-bold uppercase tracking-widest text-text-tertiary">الشركة</div>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li>عن Right</li><li>الشركاء</li><li>تواصل</li>
          </ul>
        </div>
        <div>
          <div className="mb-3 text-xs font-bold uppercase tracking-widest text-text-tertiary">قانوني</div>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li>الشروط</li><li>الخصوصية</li><li>وثيقة التغطية</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 text-xs text-text-tertiary">
          <span>© 2025 Right. جميع الحقوق محفوظة.</span>
          <span className="font-mono">Insurance Authority Sandbox · Riyadh</span>
        </div>
      </div>
    </footer>
  );
}
