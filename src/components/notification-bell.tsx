import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/time-ago";
import { Bell, HeartPulse, ShieldCheck, FileText, WifiOff } from "lucide-react";

type NotificationKind = "claim_status" | "policy_status" | "vital_alert" | "device_offline";

type Notification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
};

const KIND_ICON: Record<NotificationKind, React.ElementType> = {
  claim_status: FileText,
  policy_status: ShieldCheck,
  vital_alert: HeartPulse,
  device_offline: WifiOff,
};

export function NotificationBell({ userId }: { userId: string }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("id, kind, title, body, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data ?? []) as Notification[]);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("notifications-stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          setItems((prev) => [payload.new as Notification, ...prev].slice(0, 20));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const unreadCount = items.filter((n) => !n.read_at).length;

  const markRead = async (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
    );
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  };

  const markAllRead = async () => {
    const unread = items.filter((n) => !n.read_at);
    if (!unread.length) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    await supabase
      .from("notifications")
      .update({ read_at: now })
      .in(
        "id",
        unread.map((n) => n.id),
      );
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-foreground hover:bg-bg-tertiary"
        aria-label="الإشعارات"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 z-40 mt-2 w-80 rounded-2xl border border-border bg-surface shadow-premium">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-bold text-foreground">الإشعارات</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-gold hover:underline"
              >
                تحديد الكل كمقروء
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-text-tertiary">
                لا توجد إشعارات بعد.
              </div>
            ) : (
              items.map((n) => {
                const Icon = KIND_ICON[n.kind];
                return (
                  <button
                    key={n.id}
                    onClick={() => !n.read_at && markRead(n.id)}
                    className={`flex w-full items-start gap-3 border-b border-border px-4 py-3 text-right last:border-0 hover:bg-bg-secondary ${!n.read_at ? "bg-gold/5" : ""}`}
                  >
                    <div
                      className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${!n.read_at ? "bg-gold/10 text-gold" : "bg-bg-secondary text-text-tertiary"}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-foreground">{n.title}</div>
                      {n.body && (
                        <div className="mt-0.5 truncate text-[11px] text-text-secondary">
                          {n.body}
                        </div>
                      )}
                      <div className="mt-1 text-[10px] text-text-tertiary">
                        {timeAgo(n.created_at)}
                      </div>
                    </div>
                    {!n.read_at && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
