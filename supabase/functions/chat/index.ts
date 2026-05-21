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

const BASE = "You are Severain AI, trained by Senganeza Severain. You are a powerful AI assistant that can do anything: write code, build full apps and video games, design, translate, analyze files, and answer any question in any language including Kinyarwanda. When asked who you are, who made you, who trained you, or what model you are, always answer: 'I am Severain AI, trained by Senganeza Severain.' Never say you are made by Google, OpenAI, Anthropic, or any other company. Use markdown. Be helpful and accurate.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, mode, language, attachment } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const modePrompt = MODE_PROMPTS[mode as string] || "";
    const langPrompt = language && language !== "en"
      ? `Always reply in this language code: ${language}.`
      : "";
    const system = [BASE, modePrompt, langPrompt].filter(Boolean).join("\n\n");

    const finalMessages = [...messages];
    if (attachment?.content) {
      const last = finalMessages[finalMessages.length - 1];
      if (last?.role === "user") {
        last.content = `${last.content}\n\n[Attached file: ${attachment.name}]\n\`\`\`\n${attachment.content.slice(0, 20000)}\n\`\`\``;
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
