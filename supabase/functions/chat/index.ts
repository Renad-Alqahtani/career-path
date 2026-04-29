// Career Recommendation Chatbot - powered by Lovable AI
import knowledgeBase from "./knowledge_base.json" with { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Project context summary (from project2_document.pdf)
const PROJECT_CONTEXT = `
هذا الموقع هو "Career Recommendation System" - نظام توصية مهنية لطلاب جامعة الملك خالد (King Khalid University - College of Computer Science).

الفريق: Hana Mohammad Kamal، Renad Abdullah Alqahtani، Sarah Mohammed Mofareh، Maryam Mohammed Bakhsh — تحت إشراف Ms. Asfia Sabahath.

الهدف: مساعدة الطلاب على اكتشاف المسارات المهنية المناسبة لهم بناءً على مهاراتهم واهتماماتهم.

كيف يعمل الموقع:
1. الطالب يسجل حساب ويدخل بياناته (التخصص، المعدل، الجامعة).
2. الطالب يحدد مستوى مهاراته (من 0 إلى 5).
3. النظام يستخدم خوارزمية Cosine Similarity لمقارنة مهارات الطالب مع متطلبات الوظائف من قاعدة بيانات O*NET.
4. النظام يعرض أفضل المهن المناسبة + يحلل الفجوة في المهارات (Skill Gap) + يقترح موارد تعليمية ومنح ومرشدين.

التقنيات المستخدمة: React + Vite (Frontend)، Supabase / PostgreSQL (Backend)، خوارزمية Cosine Similarity للمطابقة.

مصدر بيانات المهن: O*NET Taxonomy (قاعدة بيانات أمريكية معيارية لتصنيف المهن والمهارات).

Job Zones (مستويات التحضير المطلوبة):
- Zone 1: تحضير قليل جداً
- Zone 2: تحضير قليل
- Zone 3: تحضير متوسط
- Zone 4: تحضير عالٍ (عادة بكالوريوس)
- Zone 5: تحضير عالٍ جداً (دراسات عليا)
`;

function detectArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

function searchOccupations(query: string, limit = 8): typeof knowledgeBase {
  const q = query.toLowerCase();
  const tokens = q.split(/\s+/).filter((t) => t.length > 2);
  if (tokens.length === 0) return [];
  const scored = (knowledgeBase as any[]).map((occ) => {
    const hay = `${occ.t} ${occ.d} ${(occ.s || []).join(" ")}`.toLowerCase();
    let score = 0;
    for (const tok of tokens) if (hay.includes(tok)) score += hay.includes(tok) ? 1 : 0;
    if (occ.t.toLowerCase().includes(q)) score += 5;
    return { occ, score };
  });
  return scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.occ);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lastUser = [...messages].reverse().find((m: any) => m.role === "user")?.content ?? "";
    const isArabic = detectArabic(lastUser);

    // Search occupations relevant to user query
    const matches = searchOccupations(lastUser, 8);
    const occupationContext =
      matches.length > 0
        ? `\n\nالمهن ذات الصلة بسؤال المستخدم (من قاعدة بيانات O*NET):\n${matches
            .map(
              (o: any) =>
                `- ${o.t} (Job Zone ${o.z ?? "?"}): ${o.d} | أهم المهارات: ${(o.s || []).join(", ")}`,
            )
            .join("\n")}`
        : "";

    const systemPrompt = `أنت مساعد ذكي للموقع التالي. مهمتك مساعدة الطلاب.

${PROJECT_CONTEXT}
${occupationContext}

قواعد مهمة:
1. اللغة: ${isArabic ? "أجب بالعربية الفصحى المبسطة." : "Respond in English."}
2. كن ودوداً ومختصراً ومباشراً.
3. عند سؤال عن مهنة معينة، استخدم بيانات O*NET أعلاه.
4. إذا سألك الطالب "كيف استخدم الموقع؟" اشرح الخطوات الأربع المذكورة أعلاه.
5. لا تخترع معلومات. إذا لم تكن متأكداً، قل ذلك بصدق.
6. لا تجب على أسئلة خارج نطاق المهن والموقع والتوجيه المهني.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "تجاوزت الحد المسموح، حاول لاحقاً." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "نفدت رصيد الذكاء الاصطناعي. يرجى إضافة رصيد." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("career-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
