import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/checkout/pay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (auth instanceof Response) return auth;
        const { userId } = auth;

        let body: { policyId?: string } = {};
        try {
          body = await request.json();
        } catch {
          /* noop */
        }
        const policyId = body.policyId;
        if (!policyId) {
          return new Response(JSON.stringify({ error: "policyId required" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }

        const { data: policy, error: fetchError } = await supabaseAdmin
          .from("policies")
          .select("id, status, owner_id")
          .eq("id", policyId)
          .maybeSingle();

        if (fetchError || !policy || policy.owner_id !== userId) {
          return new Response(JSON.stringify({ error: "Policy not found" }), {
            status: 404,
            headers: { "content-type": "application/json" },
          });
        }
        if (policy.status !== "pending") {
          return new Response(JSON.stringify({ error: "Policy is not awaiting payment" }), {
            status: 409,
            headers: { "content-type": "application/json" },
          });
        }

        // Phase 1: simulated payment, no real gateway call yet. Activation
        // must go through the service-role client because RLS only lets
        // admins update policy status directly — a confirmed payment is
        // treated as a trusted server-side event, the same way a real
        // gateway's webhook would be, not a client-side privilege.
        const { error: updateError } = await supabaseAdmin
          .from("policies")
          .update({ status: "active" })
          .eq("id", policyId);

        if (updateError) {
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
