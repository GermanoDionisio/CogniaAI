"use client";
import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Send,
  Sparkles,
  StopCircle,
  Copy,
  RotateCw,
  Check,
  ThumbsUp,
  ThumbsDown,
  Plus,
  Paperclip,
  Image as ImageIcon,
  FileText,
  FileSpreadsheet,
  FileCode,
  Presentation,
  Camera,
  Mic,
  Globe,
  Wand2,
  BookOpen,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Markdown } from "@/components/Markdown";
import { Button } from "@/components/ui/button";
import { createConversation } from "@/lib/conversations.functions";
import { toast } from "sonner";

function buildTransport(getConversationId: () => string | null) {
  return new DefaultChatTransport({
    api: "/api/chat",
    fetch: async (input, init) => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const headers = new Headers(init?.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      let body = init?.body;
      const conversationId = getConversationId();
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

type AttachmentOption = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
  accept?: string;
  prompt?: string;
  color: string;
};

const ATTACHMENT_OPTIONS: AttachmentOption[] = [
  {
    id: "photo",
    icon: ImageIcon,
    label: "Enviar imagem",
    desc: "Analiso, descrevo ou edito ideias a partir da foto",
    accept: "image/*",
    color: "text-blue-400",
  },
  {
    id: "camera",
    icon: Camera,
    label: "Tirar foto",
    desc: "Use sua câmera para capturar e enviar",
    accept: "image/*",
    color: "text-cyan-400",
  },
  {
    id: "pdf",
    icon: FileText,
    label: "Ler / Resumir PDF",
    desc: "Envio um PDF para leitura, resumo ou perguntas",
    accept: "application/pdf",
    color: "text-red-400",
  },
  {
    id: "doc",
    icon: FileText,
    label: "Documento Word",
    desc: "Analiso arquivos .docx, .txt, .md",
    accept: ".doc,.docx,.txt,.md,.rtf",
    color: "text-sky-400",
  },
  {
    id: "sheet",
    icon: FileSpreadsheet,
    label: "Planilha",
    desc: "Envie Excel, CSV ou Google Sheets para analisar",
    accept: ".csv,.xls,.xlsx,.tsv",
    color: "text-emerald-400",
  },
  {
    id: "slide",
    icon: Presentation,
    label: "Apresentação",
    desc: "Envie PPT / PPTX para resumir ou reformular",
    accept: ".ppt,.pptx,.key",
    color: "text-orange-400",
  },
  {
    id: "code",
    icon: FileCode,
    label: "Código-fonte",
    desc: "Envie arquivos de código para revisão ou refatoração",
    accept:
      ".js,.ts,.tsx,.jsx,.py,.go,.rs,.java,.c,.cpp,.cs,.rb,.php,.sql,.json,.yaml,.yml,.html,.css",
    color: "text-violet-400",
  },
  {
    id: "any",
    icon: Paperclip,
    label: "Qualquer arquivo",
    desc: "Anexe qualquer tipo (até 20MB)",
    accept: "*/*",
    color: "text-slate-300",
  },
  {
    id: "gen-image",
    icon: Wand2,
    label: "Gerar imagem",
    desc: "Descreva e eu gero uma imagem para você",
    prompt: "Gere uma imagem de: ",
    color: "text-fuchsia-400",
  },
  {
    id: "gen-pdf",
    icon: FileText,
    label: "Gerar PDF",
    desc: "Crio um PDF com o conteúdo que você pedir",
    prompt: "Crie um PDF sobre: ",
    color: "text-rose-400",
  },
  {
    id: "gen-doc",
    icon: FileText,
    label: "Gerar Word",
    desc: "Crio um documento .docx pronto para baixar",
    prompt: "Crie um documento Word (.docx) sobre: ",
    color: "text-blue-300",
  },
  {
    id: "gen-ppt",
    icon: Presentation,
    label: "Gerar Apresentação",
    desc: "Monto slides em PPTX sobre o tema",
    prompt: "Crie uma apresentação de slides sobre: ",
    color: "text-amber-400",
  },
  {
    id: "gen-sheet",
    icon: FileSpreadsheet,
    label: "Gerar Planilha",
    desc: "Crio um Excel/CSV com os dados que precisar",
    prompt: "Crie uma planilha (Excel) com: ",
    color: "text-green-400",
  },
  {
    id: "summarize",
    icon: BookOpen,
    label: "Resumir texto",
    desc: "Cole um texto e eu resumo em tópicos",
    prompt: "Resuma o seguinte texto em tópicos claros:\n\n",
    color: "text-indigo-400",
  },
  {
    id: "web",
    icon: Globe,
    label: "Pesquisar assunto",
    desc: "Explico e trago informações atualizadas",
    prompt: "Pesquise e me explique com detalhes: ",
    color: "text-teal-400",
  },
  {
    id: "voice",
    icon: Mic,
    label: "Ditar por voz",
    desc: "Grave áudio e transcrevo (em breve)",
    color: "text-pink-400",
  },
];

type ChatWindowProps = {
  threadId: string | null;
  initialMessages?: UIMessage[];
  initialTitle?: string;
};

export function ChatWindow({ threadId, initialMessages = [] }: ChatWindowProps) {
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createFn = useServerFn(createConversation);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const acceptRef = useRef<string>("*/*");
  const convIdRef = useRef<string | null>(threadId);
  const pendingNavRef = useRef<string | null>(null);

  useEffect(() => {
    convIdRef.current = threadId;
  }, [threadId]);

  const createMut = useMutation({
    mutationFn: async (title?: string) => createFn({ data: { title } }),
  });

  const transportRef = useRef<DefaultChatTransport<UIMessage> | null>(null);
  if (!transportRef.current) {
    transportRef.current = buildTransport(() => convIdRef.current);
  }

  const { messages, sendMessage, status, stop, regenerate, setMessages } = useChat({
    id: threadId ?? "new",
    messages: initialMessages,
    transport: transportRef.current,
    onError: (err) => {
      toast.error("Erro ao gerar resposta", { description: err.message });
    },
    onFinish: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      const current = convIdRef.current;
      if (current) queryClient.invalidateQueries({ queryKey: ["conversation", current] });
      const pending = pendingNavRef.current;
      if (pending) {
        pendingNavRef.current = null;
        navigate({ to: "/chat/$threadId", params: { threadId: pending }, replace: true });
      }
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
    if ((!text && attachedFiles.length === 0) || isLoading) return;

    if (!convIdRef.current) {
      const title = (text || attachedFiles[0]?.name || "Nova conversa").slice(0, 60);
      try {
        const created = await createMut.mutateAsync(title);
        convIdRef.current = created.id;
        pendingNavRef.current = created.id;
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      } catch (err) {
        toast.error("Não foi possível criar a conversa", { description: (err as Error).message });
        return;
      }
    }

    let fileList: FileList | undefined;
    if (attachedFiles.length) {
      const dt = new DataTransfer();
      attachedFiles.forEach((f) => dt.items.add(f));
      fileList = dt.files;
    }
    setInput("");
    setAttachedFiles([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    try {
      await sendMessage({ text: text || "Analise o(s) arquivo(s) enviado(s).", files: fileList });
    } catch (err) {
      toast.error("Falha ao enviar", { description: (err as Error).message });
    }
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

  function pickOption(opt: AttachmentOption) {
    setMenuOpen(false);
    if (opt.accept) {
      acceptRef.current = opt.accept;
      requestAnimationFrame(() => {
        if (fileInputRef.current) {
          fileInputRef.current.accept = opt.accept!;
          fileInputRef.current.click();
        }
      });
    } else if (opt.prompt) {
      setInput((prev) => (prev ? prev + "\n" + opt.prompt : opt.prompt!));
      textareaRef.current?.focus();
    } else if (opt.id === "voice") {
      toast.info("Ditado por voz em breve", { description: "Estamos trabalhando nisso!" });
    }
  }

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const tooBig = files.find((f) => f.size > 20 * 1024 * 1024);
    if (tooBig) {
      toast.error("Arquivo muito grande", { description: `${tooBig.name} passa de 20MB` });
      e.target.value = "";
      return;
    }
    setAttachedFiles((prev) => [...prev, ...files].slice(0, 10));
    e.target.value = "";
  }

  const showWelcome = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {showWelcome ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
              <div
                className="w-16 h-16 rounded-2xl mb-6 flex items-center justify-center shadow-(--shadow-elegant)"
                style={{ background: "var(--gradient-brand)" }}
              >
                <Sparkles className="w-8 h-8 text-white" strokeWidth={2.2} />
              </div>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
                Olá, como posso <span className="gradient-text">ajudar</span>?
              </h1>
              <p className="text-muted-foreground max-w-md text-sm sm:text-base">
                Pergunte qualquer coisa. Sou a Cognia AI, sua assistente para programação, estudos,
                pesquisa e produtividade.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((m) => {
                const text = (m.parts ?? []).map((p) => (p.type === "text" ? p.text : "")).join("");
                const files = (m.parts ?? []).filter((p) => p.type === "file") as Array<{
                  type: "file";
                  url?: string;
                  mediaType?: string;
                  filename?: string;
                }>;
                const isUser = m.role === "user";
                const isStreamingThis =
                  !isUser && status === "streaming" && m.id === messages[messages.length - 1]?.id;
                return (
                  <div
                    key={m.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                  >
                    <div className={isUser ? "max-w-[85%]" : "w-full"}>
                      {isUser ? (
                        <div className="rounded-2xl px-4 py-3 bg-primary text-primary-foreground shadow-md space-y-2">
                          {files.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {files.map((f, i) =>
                                f.mediaType?.startsWith("image/") && f.url ? (
                                  <img
                                    key={i}
                                    src={f.url}
                                    alt={f.filename ?? ""}
                                    className="rounded-lg max-h-40"
                                  />
                                ) : (
                                  <div
                                    key={i}
                                    className="text-xs bg-primary-foreground/10 px-2 py-1 rounded-md flex items-center gap-1"
                                  >
                                    <Paperclip className="w-3 h-3" /> {f.filename ?? "arquivo"}
                                  </div>
                                ),
                              )}
                            </div>
                          )}
                          {text && <div className="whitespace-pre-wrap text-sm">{text}</div>}
                        </div>
                      ) : (
                        <div className="group">
                          <div className={isStreamingThis ? "caret" : ""}>
                            <Markdown>{text || ""}</Markdown>
                          </div>
                          {!isStreamingThis && text && (
                            <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2"
                                onClick={() => copyMessage(m.id, text)}
                              >
                                {copiedId === m.id ? (
                                  <Check className="w-3.5 h-3.5" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2"
                                onClick={() => regenerate()}
                              >
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
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 sm:py-4 relative">
          {/* Anexos preview */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachedFiles.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-xs bg-sidebar-accent/60 border border-border/50 rounded-lg px-2 py-1.5"
                >
                  <Paperclip className="w-3 h-3 text-muted-foreground" />
                  <span className="max-w-40 truncate">{f.name}</span>
                  <button
                    onClick={() => setAttachedFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="opacity-70 hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Menu "+" */}
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute bottom-full left-3 sm:left-4 mb-2 z-40 w-[min(92vw,420px)] rounded-2xl border border-border/60 bg-popover/95 backdrop-blur-xl shadow-(--shadow-elegant) p-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="grid grid-cols-1 max-h-[60vh] overflow-y-auto">
                  {ATTACHMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => pickOption(opt)}
                      className="flex items-start gap-3 text-left px-3 py-2.5 rounded-xl hover:bg-sidebar-accent transition-colors"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg bg-sidebar-accent/70 flex items-center justify-center shrink-0 ${opt.color}`}
                      >
                        <opt.icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{opt.label}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">{opt.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <input ref={fileInputRef} type="file" multiple hidden onChange={onFilePicked} />

          <form
            onSubmit={handleSubmit}
            className="glass rounded-2xl p-2 flex items-end gap-1.5 sm:gap-2 focus-within:border-primary/60 transition-colors shadow-(--shadow-elegant)"
          >
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-xl shrink-0 h-9 w-9 sm:h-10 sm:w-10"
              aria-label="Adicionar anexo"
            >
              <Plus className={`w-5 h-5 transition-transform ${menuOpen ? "rotate-45" : ""}`} />
            </Button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={autoResize}
              onKeyDown={handleKey}
              placeholder="Pergunte algo à Cognia AI..."
              rows={1}
              className="flex-1 min-w-0 bg-transparent resize-none outline-none px-2 sm:px-3 py-2.5 text-sm placeholder:text-muted-foreground max-h-60"
              disabled={isLoading}
            />
            {isLoading ? (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                onClick={() => stop()}
                className="rounded-xl shrink-0 h-9 w-9 sm:h-10 sm:w-10"
              >
                <StopCircle className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() && attachedFiles.length === 0}
                className="rounded-xl shrink-0 h-9 w-9 sm:h-10 sm:w-10"
                style={{ background: "var(--gradient-brand)", color: "white" }}
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
          </form>
          <p className="text-[11px] text-muted-foreground text-center mt-2 px-4">
            Cognia AI pode cometer erros. Verifique informações importantes.
          </p>
        </div>
      </div>
    </div>
  );
}
