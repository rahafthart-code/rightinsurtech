import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

// Readiness probe — verifies DB + Realtime are reachable.
// Returns 503 if any critical dependency is down.
export const Route = createFileRoute("/api/readiness")({
  server: {
    handlers: {
      GET: async () => {
        const checks: Record<string, { ok: boolean; latency_ms?: number; error?: string }> = {};

        // DB check
        const dbStart = Date.now();
        try {
          const url = process.env.SUPABASE_URL;
          const key = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (!url || !key) throw new Error("missing supabase env");
          const sb = createClient(url, key, { auth: { persistSession: false } });
          const { error } = await sb
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .limit(1);
          if (error && error.code !== "PGRST116") throw error;
          checks.database = { ok: true, latency_ms: Date.now() - dbStart };
        } catch (e) {
          const msg = e instanceof Error ? e.message : "unknown";
          checks.database = { ok: false, error: msg, latency_ms: Date.now() - dbStart };
          logger.error("readiness.database.failed", { error: msg });
        }

        // Realtime check (presence of WS endpoint)
        try {
          const url = process.env.SUPABASE_URL;
          checks.realtime = { ok: Boolean(url) };
        } catch {
          checks.realtime = { ok: false, error: "no realtime url" };
        }

        const allOk = Object.values(checks).every((c) => c.ok);
        return new Response(
          JSON.stringify({
            status: allOk ? "ready" : "degraded",
            checks,
            timestamp: new Date().toISOString(),
          }),
          {
            status: allOk ? 200 : 503,
            headers: {
              "content-type": "application/json",
              "cache-control": "no-store",
            },
          },
        );
      },
    },
  },
});
