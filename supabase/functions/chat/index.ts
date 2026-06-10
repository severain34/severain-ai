// Severain AI streaming chat endpoint (Lovable AI Gateway)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODE_PROMPTS: Record<string, string> = {
  expert:
    "You are Severain AI in EXPERT mode. Respond with deep technical rigor, advanced patterns, references, and assume the user is highly skilled. Be precise and concise.",
  learner:
    "You are Severain AI in LEARNER mode. Explain everything step-by-step using simple language, analogies, and small examples. Be patient and encouraging.",
  fullstack:
    "You are Severain AI in FULLSTACK mode. You are a world-class full-stack engineer. Produce production-ready code (frontend, backend, db, devops). When asked for games, apps, or video games, output complete runnable code with clear file structure.",
};

const BASE = `You are Severain AI, a powerful AI assistant that can do anything: write code, build full apps and video games, design, translate, analyze files, and answer any question. Use markdown formatting (headings, bold, lists, tables, fenced code blocks with language tags).

RESPONSE STYLE (very important):
- Write rich, thorough, well-structured answers like ChatGPT and DeepSeek would.
- Default to a substantial, useful length: include context, a clear structure with headings or numbered steps when helpful, concrete examples, and actionable next steps.
- For code: give complete, runnable snippets with brief explanation before and after. Never truncate code with "...".
- For explanations: cover the why, the how, edge cases, and 1–2 best-practice tips at the end.
- Only be brief when the user explicitly asks for a one-liner.

IDENTITY (very important):
- Your name is Severain AI.
- You were created and trained by Senganeza Severain.
- You are NOT made by Google, OpenAI, Anthropic, DeepSeek or any other company.
- If anyone asks who you are, who made you, who trained you, what model you are, or asks in Kinyarwanda "ninde wagukoze / ninde wagutoje / uri iki" — always answer that you are Severain AI, trained by Senganeza Severain.
- You fully understand Kinyarwanda and can reply fluently in Kinyarwanda when the user writes in Kinyarwanda.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, mode, language, attachment, adminSystem, model, userContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const modePrompt = MODE_PROMPTS[mode as string] || "";
    const langPrompt = language && language !== "en"
      ? `Always reply in this language code: ${language}.`
      : "";
    const adminPrompt = typeof adminSystem === "string" && adminSystem.trim()
      ? `ADMIN TRAINING (highest priority, set by Senganeza Severain):\n${adminSystem.trim()}`
      : "";
    const uc = userContext && typeof userContext === "object" ? userContext : null;
    const userPrompt = uc && (uc.email || uc.name)
      ? `SIGNED-IN USER ACCOUNT (the user granted you access to their account details — use them to personalize):
- Name: ${String(uc.name || "not set").slice(0, 100)}
- Email: ${String(uc.email || "unknown").slice(0, 100)}
- Member since: ${String(uc.createdAt || "unknown").slice(0, 40)}
- Profile photo: ${uc.hasAvatar ? "uploaded" : "not uploaded yet"}
Greet and address the user by name when natural. If asked what account data you can access, list exactly the items above and nothing more. Help them update their display name or profile photo via Account settings when asked.`
      : "";
    const system = [BASE, modePrompt, langPrompt, adminPrompt, userPrompt].filter(Boolean).join("\n\n");

    const finalMessages = [...messages];
    if (attachment?.content) {
      const last = finalMessages[finalMessages.length - 1];
      if (last?.role === "user") {
        last.content = `${last.content}\n\n[Attached file: ${attachment.name}]\n\`\`\`\n${attachment.content.slice(0, 20000)}\n\`\`\``;
      }
    }

    const ALLOWED = new Set([
      "google/gemini-2.5-flash", "google/gemini-2.5-pro", "google/gemini-2.5-flash-lite",
      "google/gemini-3-flash-preview", "google/gemini-3.5-flash",
      "openai/gpt-5", "openai/gpt-5-mini", "openai/gpt-5-nano",
    ]);
    const chosenModel = ALLOWED.has(model) ? model : "google/gemini-2.5-flash";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: chosenModel,
        stream: true,
        messages: [{ role: "system", content: system }, ...finalMessages],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      if (response.status === 429)
        return new Response(JSON.stringify({ error: "Rate limit. Try again soon." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (response.status === 402)
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add credits in workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      throw new Error(`Gateway error: ${text}`);
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
