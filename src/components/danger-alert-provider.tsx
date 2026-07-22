import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AlertTriangle, Phone, X } from "lucide-react";

// TODO: replace with your real veterinary emergency line before launch.
// This is a placeholder — do not ship an emergency-call button pointing
// at a number nobody answers.
const VET_EMERGENCY_PHONE = "+966000000000";

type DangerAlert = {
  id: string;
  title: string;
  body: string | null;
};

export function DangerAlertProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [alert, setAlert] = useState<DangerAlert | null>(null);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("danger-alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const n = payload.new as { kind: string; id: string; title: string; body: string | null };
          // Only genuinely critical vital readings get the full-screen
          // takeover — device-offline/claim/policy updates stay in the
          // notification bell, they aren't life-threatening emergencies.
          if (n.kind === "vital_alert") {
            setAlert({ id: n.id, title: n.title, body: n.body });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <>
      {children}
      {alert && (
        <div
          role="alertdialog"
          aria-live="assertive"
          className="fixed inset-0 z-[100] grid place-items-center bg-destructive/95 p-6 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto inline-flex h-16 w-16 animate-pulse items-center justify-center rounded-2xl bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="mt-5 text-xl font-black text-foreground">{alert.title}</h1>
            {alert.body && <p className="mt-2 text-sm text-text-secondary">{alert.body}</p>}
            <div className="mt-7 flex flex-col gap-3">
              <a
                href={`tel:${VET_EMERGENCY_PHONE}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-destructive px-6 py-3.5 text-base font-bold text-white transition hover:opacity-90 active:scale-[0.98]"
              >
                <Phone className="h-4 w-4" /> اتصال سريع بالطبيب البيطري
              </a>
              <button
                onClick={() => setAlert(null)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-bold text-foreground transition hover:bg-bg-secondary active:scale-[0.98]"
              >
                <X className="h-4 w-4" /> إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
