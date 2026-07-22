// Thin HTTP wrapper around public.run_iot_watchdog() for on-demand or
// external invocation (a manual "scan now" admin action, an external
// uptime monitor, etc). The automatic every-5-minutes run is wired up
// directly in Postgres via pg_cron (see the matching migration) and
// does not go through this function at all — the actual offline/
// low-battery/dedup logic lives in that one SQL function so it stays in
// one place and is testable with the project's pgTAP suite.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  // Gated to the service role only — running the watchdog is an
  // operational action, not something arbitrary callers should trigger.
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (token !== SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data, error } = await supabase.rpc("run_iot_watchdog");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ alerts_created: data }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});
