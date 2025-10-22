import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const needsWebSearch = (message: string): boolean => {
  const searchKeywords = [
    "busca", "pesquisa", "procura", "encontre", "busque", "pesquise",
    "qual é", "qual e", "quais são", "quais sao",
    "notícias", "noticias", "atual", "recente", "hoje", "agora",
    "preço", "preco", "valor", "quanto custa",
    "onde", "quando", "como funciona",
    "última", "ultimo", "mais recente"
  ];

  const lowerMessage = message.toLowerCase();
  return searchKeywords.some(keyword => lowerMessage.includes(keyword));
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Formato de mensagens inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (messages.length > 100) {
      return new Response(JSON.stringify({ error: "Número de mensagens excede o limite" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return new Response(JSON.stringify({ error: "Mensagem inválida" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (msg.content.length > 10000) {
        return new Response(JSON.stringify({ error: "Mensagem muito longa" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemMessage = "Você é um assistente virtual prestativo e amigável. Responda de forma clara, concisa e útil em português.";
    const lastUserMessage = messages[messages.length - 1];

    if (lastUserMessage && needsWebSearch(lastUserMessage.content)) {
      try {
        const searchResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/web-search`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query: lastUserMessage.content }),
          }
        );

        if (searchResponse.ok) {
          const searchResults = await searchResponse.json();
          if (searchResults.results && searchResults.results.length > 0) {
            const resultsText = searchResults.results
              .slice(0, 5)
              .map((r: { title: string; snippet: string; url: string }) =>
                `Título: ${r.title}\nConteúdo: ${r.snippet}\nURL: ${r.url}`
              )
              .join("\n\n");

            systemMessage = `Você é um assistente virtual prestativo e amigável. Use as seguintes informações da web para responder a pergunta do usuário de forma precisa e atualizada. Sempre cite as fontes quando usar informações específicas.\n\nResultados da busca:\n${resultsText}`;
          }
        }
      } catch (searchError) {
        console.error("Error searching web:", searchError);
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
        messages: [
          { role: "system", content: systemMessage },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente mais tarde." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao seu workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
