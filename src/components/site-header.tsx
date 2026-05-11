import { Link } from "@tanstack/react-router";
import logo from "@/assets/right-logo.png";
import { useAuth } from "@/hooks/use-auth";

export function SiteHeader() {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Right" className="h-7 w-auto" />
        </Link>
        <nav className="hidden items-center gap-8 text-sm md:flex">
          <Link to="/" className="text-text-secondary transition hover:text-foreground" activeOptions={{ exact: true }} activeProps={{ className: "text-foreground" }}>الرئيسية</Link>
          <Link to="/pricing" className="text-text-secondary transition hover:text-foreground" activeProps={{ className: "text-foreground" }}>الأسعار</Link>
          <a href="#features" className="text-text-secondary transition hover:text-foreground">المزايا</a>
          <a href="#how" className="text-text-secondary transition hover:text-foreground">كيف يعمل</a>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Link to="/dashboard" className="inline-flex items-center justify-center rounded-md bg-gradient-gold px-4 py-2 text-sm font-bold text-primary-foreground shadow-gold transition hover:opacity-95">
              لوحة التحكم
            </Link>
          ) : (
            <>
              <Link to="/login" className="hidden rounded-md px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary md:inline-flex">دخول</Link>
              <Link to="/login" className="inline-flex items-center justify-center rounded-md bg-gradient-gold px-4 py-2 text-sm font-bold text-primary-foreground shadow-gold transition hover:opacity-95">
                ابدأ الآن
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
