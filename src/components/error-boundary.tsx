import { Component, type ReactNode } from "react";
import { logger } from "@/lib/logger";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean; error?: Error };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    logger.error("react.error_boundary", {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="grid min-h-screen place-items-center bg-background px-6 text-center" dir="rtl">
          <div className="max-w-md">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-gold shadow-gold">
              <span className="text-2xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-black text-foreground">حدث خطأ غير متوقع</h1>
            <p className="mt-2 text-sm text-text-secondary">
              نعتذر، حصل خلل أثناء عرض هذه الصفحة. تم تسجيل المشكلة وفريقنا سيراجعها.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-gradient-gold px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-gold"
              >
                إعادة المحاولة
              </button>
              <a
                href="/"
                className="rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-bold text-foreground"
              >
                العودة للرئيسية
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
