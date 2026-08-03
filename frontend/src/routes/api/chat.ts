import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `Você é a Cognia AI, uma assistente de inteligência artificial de nível profissional, criada para ajudar em programação, estudos, pesquisa, criação de conteúdo, produtividade e conhecimentos gerais.

Diretrizes:
- Responda em português (a menos que o usuário use outro idioma).
- Seja clara, organizada, objetiva e cordial.
- Use Markdown rico: títulos, listas, tabelas, blocos de código com a linguagem correta.
- Para código, use blocos com syntax highlighting (\`\`\`ts, \`\`\`python, etc).
- Ao explicar temas técnicos, forneça exemplos práticos.
- Em temas de saúde, direito ou finanças, deixe claro que você não substitui um profissional qualificado.
- Nunca invente fatos: se não souber, diga.`;

type ChatRequestBody = {
  messages?: unknown;
  conversationId?: string;
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages, conversationId } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");
        const uiMessages = messages as UIMessage[];

        const result = streamText({
          model,
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(uiMessages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: uiMessages,
          onFinish: async ({ messages: finalMessages }) => {
            if (!conversationId) return;
            const authHeader = request.headers.get("authorization");
            if (!authHeader) return;
            try {
              const { createClient } = await import("@supabase/supabase-js");
              const token = authHeader.replace("Bearer ", "");
              const supabase = createClient(
                process.env.SUPABASE_URL!,
                process.env.SUPABASE_PUBLISHABLE_KEY!,
                {
                  global: {
                    headers: {
                      Authorization: `Bearer ${token}`,
                      apikey: process.env.SUPABASE_PUBLISHABLE_KEY!,
                    },
                  },
                  auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
                },
              );
              const { data: userData } = await supabase.auth.getUser(token);
              const userId = userData.user?.id;
              if (!userId) return;

              // Persist only the last user message + assistant message
              const lastUser = [...uiMessages].reverse().find((m) => m.role === "user");
              const lastAssistant = [...finalMessages]
                .reverse()
                .find((m) => m.role === "assistant");

              const toText = (m: UIMessage) =>
                (m.parts ?? []).map((p) => (p.type === "text" ? p.text : "")).join("");

              const rows: Array<{
                conversation_id: string;
                user_id: string;
                role: string;
                content: string;
                message_data: unknown;
              }> = [];
              if (lastUser)
                rows.push({
                  conversation_id: conversationId,
                  user_id: userId,
                  role: "user",
                  content: toText(lastUser),
                  message_data: lastUser,
                });
              if (lastAssistant)
                rows.push({
                  conversation_id: conversationId,
                  user_id: userId,
                  role: "assistant",
                  content: toText(lastAssistant),
                  message_data: lastAssistant,
                });
              if (rows.length) {
                await supabase.from("messages").insert(rows);
                await supabase
                  .from("conversations")
                  .update({ updated_at: new Date().toISOString() })
                  .eq("id", conversationId);
              }
            } catch (err) {
              console.error("[chat] persist failed", err);
            }
          },
        });
      },
    },
  },
});
