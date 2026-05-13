import { createFileRoute } from "@tanstack/react-router";

type Msg = { role: "system" | "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `أنت "وسام" — مساعد بيطري ذكي داخل تطبيق Right للتأمين على الأصول التراثية (خيل، إبل، صقور) في الخليج العربي.

الأسلوب:
- اللغة: عربية فصحى مبسطة أو لهجة سعودية حسب المستخدم.
- النبرة: دافئة، علمية، مطمئنة، مختصرة (لا تتجاوز 120 كلمة في الإجابات العادية).
- ابدأ بالخلاصة ثم اشرح بنقاط قصيرة عند الحاجة.

حدود صارمة (لا تُكسر):
- لا تشخّص أمراضاً قاطعة → أعطِ احتمالات فقط.
- لا تصف أدوية أو جرعات.
- في أي حالة حرجة (نزف، صعوبة تنفس، شلل، حرارة فوق 40م، نبض غير مستقر) قُل صراحة: "اتصل بالطبيب البيطري فوراً".
- إذا خرج السؤال عن تخصصك → "هذا خارج نطاق خدمتي، أنا متخصص في صحة ورعاية الخيل والإبل والصقور."

عند توفر سياق الحيوان (الاسم/النوع/النبض/الحرارة) فاستخدمه في الإجابة بصياغة طبيعية.`;

export const Route = createFileRoute("/api/ai/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }), {
            status: 500, headers: { "content-type": "application/json" },
          });
        }
        let body: { messages?: Msg[]; context?: string } = {};
        try { body = await request.json(); } catch { /* noop */ }
        const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
        if (!messages.length) {
          return new Response(JSON.stringify({ error: "messages required" }), {
            status: 400, headers: { "content-type": "application/json" },
          });
        }

        const sys: Msg = {
          role: "system",
          content: body.context ? `${SYSTEM_PROMPT}\n\nسياق الحيوان الحالي:\n${body.context}` : SYSTEM_PROMPT,
        };

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [sys, ...messages],
            stream: true,
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          const status = upstream.status === 429 ? 429 : upstream.status === 402 ? 402 : 500;
          const msg = status === 429 ? "تم تجاوز الحد المسموح، حاول بعد دقائق."
            : status === 402 ? "رصيد الذكاء الاصطناعي غير كافٍ. يرجى إضافة رصيد لمتابعة الاستخدام."
            : (text || "تعذّر الاتصال بمزود الذكاء الاصطناعي.");
          return new Response(JSON.stringify({ error: msg }), {
            status, headers: { "content-type": "application/json" },
          });
        }

        return new Response(upstream.body, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        });
      },
    },
  },
});
