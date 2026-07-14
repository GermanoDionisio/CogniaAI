"use client";
import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Send, Sparkles, StopCircle, Copy, RotateCw, Check, ThumbsUp, ThumbsDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Markdown } from "@/components/Markdown";
import { Button } from "@/components/ui/button";
import { createConversation } from "@/lib/conversations.functions";
import { toast } from "sonner";

const SUGGESTIONS = [
  { title: "Explique um conceito", prompt: "Explique de forma simples o que é machine learning, com exemplos práticos." },
  { title: "Escreva código", prompt: "Escreva uma função em TypeScript que faça debounce, com testes." },
  { title: "Crie um plano", prompt: "Crie um plano de estudos de 4 semanas para aprender React do zero ao avançado." },
  { title: "Analise e resuma", prompt: "Resuma as principais diferenças entre PostgreSQL e MongoDB em uma tabela." },
];

function buildTransport(conversationId: string | null) {
  return new DefaultChatTransport({
    api: "/api/chat",
    fetch: async (input, init) => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const headers = new Headers(init?.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      // Inject conversationId into request body
      let body = init?.body;
      if (typeof body === "string" && conversationId) {
        try {
          const parsed = JSON.parse(body);
          parsed.conversationId = conversationId;
          body = JSON.stringify(parsed);
        } catch {}
      }
      return fetch(input, { ...init, headers, body });
    },
  });
}

type ChatWindowProps = {
  threadId: string | null;
  initialMessages?: UIMessage[];
  initialTitle?: string;
};

export function ChatWindow({ threadId, initialMessages = [], initialTitle }: ChatWindowProps) {
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createFn = useServerFn(createConversation);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const createMut = useMutation({
    mutationFn: async (title?: string) => createFn({ data: { title } }),
  });

  const transport = buildTransport(threadId);
  const { messages, sendMessage, status, stop, regenerate, setMessages } = useChat({
    id: threadId ?? "new",
    messages: initialMessages,
    transport,
    onError: (err) => {
      toast.error("Erro ao gerar resposta", { description: err.message });
    },
    onFinish: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      if (threadId) queryClient.invalidateQueries({ queryKey: ["conversation", threadId] });
    },
  });

  useEffect(() => {
    setMessages(initialMessages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const isLoading = status === "submitted" || status === "streaming";

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    let convId = threadId;
    if (!convId) {
      const title = text.slice(0, 60);
      const created = await createMut.mutateAsync(title);
      convId = created.id;
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      navigate({ to: "/chat/$threadId", params: { threadId: convId }, replace: true });
    }
    setInput("");
    await sendMessage({ text });
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 240) + "px";
  }

  async function copyMessage(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  const showWelcome = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {showWelcome ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
              <div
                className="w-16 h-16 rounded-2xl mb-6 flex items-center justify-center shadow-[var(--shadow-elegant)]"
                style={{ background: "var(--gradient-brand)" }}
              >
                <Sparkles className="w-8 h-8 text-white" strokeWidth={2.2} />
              </div>
              <h1 className="text-4xl font-semibold tracking-tight mb-3">
                Olá, como posso <span className="gradient-text">ajudar</span>?
              </h1>
              <p className="text-muted-foreground mb-10 max-w-md">
                {initialTitle ?? "Pergunte qualquer coisa. Sou a Cognia AI, sua assistente para programação, estudos, pesquisa e produtividade."}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.title}
                    onClick={() => setInput(s.prompt)}
                    className="glass text-left rounded-2xl p-4 hover:border-primary/50 transition-all hover:scale-[1.02] group"
                  >
                    <div className="text-sm font-medium mb-1 group-hover:text-primary transition-colors">{s.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{s.prompt}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((m) => {
                const text = (m.parts ?? []).map((p) => (p.type === "text" ? p.text : "")).join("");
                const isUser = m.role === "user";
                const isStreamingThis =
                  !isUser && status === "streaming" && m.id === messages[messages.length - 1]?.id;
                return (
                  <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                    <div className={isUser ? "max-w-[80%]" : "w-full"}>
                      {isUser ? (
                        <div className="rounded-2xl px-4 py-3 bg-primary text-primary-foreground shadow-md">
                          <div className="whitespace-pre-wrap text-sm">{text}</div>
                        </div>
                      ) : (
                        <div className="group">
                          <div className={isStreamingThis ? "caret" : ""}>
                            <Markdown>{text || ""}</Markdown>
                          </div>
                          {!isStreamingThis && text && (
                            <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => copyMessage(m.id, text)}>
                                {copiedId === m.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => regenerate()}>
                                <RotateCw className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2">
                                <ThumbsUp className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2">
                                <ThumbsDown className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {status === "submitted" && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm animate-thinking">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  Pensando...
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border/50 bg-background/60 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="glass rounded-2xl p-2 flex items-end gap-2 focus-within:border-primary/60 transition-colors shadow-[var(--shadow-elegant)]">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={autoResize}
              onKeyDown={handleKey}
              placeholder="Envie uma mensagem para a Cognia AI..."
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none px-3 py-2.5 text-sm placeholder:text-muted-foreground max-h-60"
              disabled={isLoading}
            />
            {isLoading ? (
              <Button type="button" size="icon" variant="secondary" onClick={() => stop()} className="rounded-xl">
                <StopCircle className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim()}
                className="rounded-xl"
                style={{ background: "var(--gradient-brand)", color: "white" }}
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
          </form>
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            Cognia AI pode cometer erros. Verifique informações importantes.
          </p>
        </div>
      </div>
    </div>
  );
}
