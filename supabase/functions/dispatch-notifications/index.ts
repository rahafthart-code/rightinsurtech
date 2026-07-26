// Invoked every minute by pg_cron/pg_net (see the matching migration).
// Scans recent notifications that haven't gone out on each channel yet
// and dispatches them:
//   - SMS (Authentica): only for 'vital_alert' — the one kind urgent
//     enough to justify the cost of a text message. Everything else
//     (claim/policy status, device offline) is a monitoring/admin
//     update, not an emergency.
//   - Email (Resend): every kind, but only if the owner has set an
//     email address (the app only ever collects a phone number, so most
//     users won't have one yet).
//
// Authentica API details (base URL, endpoint, header, body shape) are
// from Authentica's own published docs as of this writing — verify
// against their current documentation before relying on this in
// production, since third-party APIs change.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const AUTHENTICA_API_KEY = Deno.env.get("AUTHENTICA_API_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "Right <notifications@right.sa>";

const SMS_KINDS = new Set(["vital_alert"]);
const LOOKBACK_MS = 24 * 60 * 60 * 1000;
const BATCH_LIMIT = 50;

type PendingNotification = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string | null;
};

async function sendSms(phone: string, text: string): Promise<boolean> {
  if (!AUTHENTICA_API_KEY) return false;
  try {
    const res = await fetch("https://api.authentica.sa/api/v2/send-sms", {
      method: "POST",
      headers: {
        "X-Authorization": AUTHENTICA_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ phone, message: text }),
    });
    if (!res.ok) console.error("Authentica SMS failed", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("Authentica SMS error", e);
    return false;
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: RESEND_FROM, to, subject, html }),
    });
    if (!res.ok) console.error("Resend email failed", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("Resend email error", e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader.replace(/^Bearer\s+/i, "") !== SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: pending, error } = await supabase
    .from("notifications")
    .select("id, user_id, kind, title, body")
    .or("sms_sent_at.is.null,email_sent_at.is.null")
    .gte("created_at", new Date(Date.now() - LOOKBACK_MS).toISOString())
    .order("created_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const list = (pending ?? []) as PendingNotification[];
  if (list.length === 0) {
    return new Response(JSON.stringify({ sms_sent: 0, email_sent: 0 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const userIds = [...new Set(list.map((n) => n.user_id))];
  const { data: profiles } = await supabase.from("profiles").select("id, email").in("id", userIds);
  const emailByUser = new Map((profiles ?? []).map((p) => [p.id, p.email as string | null]));

  let smsSent = 0;
  let emailSent = 0;
  const now = new Date().toISOString();

  for (const n of list) {
    const needsSms = SMS_KINDS.has(n.kind);
    const email = emailByUser.get(n.user_id) ?? null;
    const messageText = n.body ? `${n.title} - ${n.body}` : n.title;
    const update: Record<string, string> = {};

    if (needsSms) {
      const { data: authUser } = await supabase.auth.admin.getUserById(n.user_id);
      const phone = authUser?.user?.phone;
      if (phone && (await sendSms(phone, messageText))) {
        update.sms_sent_at = now;
        smsSent++;
      } else {
        // No phone, or the send failed — either way, don't retry this
        // one forever; a real retry policy is a follow-up, not this MVP.
        update.sms_sent_at = now;
      }
    } else {
      update.sms_sent_at = now;
    }

    if (email) {
      const html = `<p>${n.title}</p>${n.body ? `<p>${n.body}</p>` : ""}`;
      if (await sendEmail(email, n.title, html)) {
        update.email_sent_at = now;
        emailSent++;
      } else {
        update.email_sent_at = now;
      }
    } else {
      update.email_sent_at = now;
    }

    await supabase.from("notifications").update(update).eq("id", n.id);
  }

  return new Response(JSON.stringify({ sms_sent: smsSent, email_sent: emailSent }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});
