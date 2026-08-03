import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getLibrary } from "@/lib/library.functions";
import { MessageSquare, FileText, Image as ImageIcon, Search, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/library")({
  component: LibraryPage,
  head: () => ({
    meta: [
      { title: "Biblioteca — Cognia AI" },
      { name: "description", content: "Todas as suas conversas, documentos e imagens gerados com a Cognia AI em um só lugar." },
      { property: "og:title", content: "Biblioteca — Cognia AI" },
      { property: "og:description", content: "Conversas, documentos e imagens da sua assistente Cognia AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Tab = "conversas" | "documentos" | "imagens";

function LibraryPage() {
  const fn = useServerFn(getLibrary);
  const { data, isLoading } = useQuery({ queryKey: ["library"], queryFn: () => fn() });
  const [tab, setTab] = useState<Tab>("conversas");
  const [q, setQ] = useState("");

  const conversations = (data?.conversations ?? []).filter((c) =>
    c.title.toLowerCase().includes(q.toLowerCase()),
  );
  const files = (data?.files ?? []).filter((f) => f.filename.toLowerCase().includes(q.toLowerCase()));
  const images = files.filter((f) => f.mediaType.startsWith("image/"));
  const docs = files.filter((f) => !f.mediaType.startsWith("image/"));

  const tabs: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string }>; count: number }> = [
    { id: "conversas", label: "Conversas", icon: MessageSquare, count: conversations.length },
    { id: "documentos", label: "Documentos", icon: FileText, count: docs.length },
    { id: "imagens", label: "Imagens", icon: ImageIcon, count: images.length },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Biblioteca</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tudo o que você criou com a Cognia AI: conversas, documentos e imagens.
          </p>
        </header>

        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar na biblioteca..."
            className="w-full text-sm bg-sidebar-accent/50 border border-border/60 rounded-xl pl-9 pr-3 py-2.5 outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        <div className="flex gap-1 mb-5 p-1 rounded-xl bg-sidebar-accent/40 border border-border/50 w-full overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                tab === t.id ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              <span className="text-xs text-muted-foreground">{t.count}</span>
            </button>
          ))}
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

        {tab === "conversas" && (
          <div className="grid sm:grid-cols-2 gap-3">
            {conversations.map((c) => (
              <Link
                key={c.id}
                to="/chat/$threadId"
                params={{ threadId: c.id }}
                className="group rounded-xl border border-border/60 bg-card/40 hover:bg-sidebar-accent/60 transition-colors p-4 min-w-0"
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{c.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(c.updated_at ?? c.created_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                  {c.favorite && <Star className="w-3.5 h-3.5 ml-auto shrink-0 fill-primary text-primary" />}
                </div>
              </Link>
            ))}
            {!isLoading && conversations.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma conversa encontrada.</p>
            )}
          </div>
        )}

        {tab === "documentos" && (
          <div className="space-y-2">
            {docs.map((f, i) => (
              <Link
                key={f.messageId + i}
                to="/chat/$threadId"
                params={{ threadId: f.conversationId }}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 hover:bg-sidebar-accent/60 transition-colors p-3"
              >
                <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                <span className="text-sm truncate flex-1 min-w-0">{f.filename}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(f.createdAt).toLocaleDateString("pt-BR")}
                </span>
              </Link>
            ))}
            {!isLoading && docs.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum documento ainda. Envie um arquivo no chat.</p>
            )}
          </div>
        )}

        {tab === "imagens" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((f, i) => (
              <Link
                key={f.messageId + i}
                to="/chat/$threadId"
                params={{ threadId: f.conversationId }}
                className="block rounded-xl overflow-hidden border border-border/60 hover:opacity-90 transition"
              >
                <img src={f.url} alt={f.filename} className="w-full h-32 object-cover" loading="lazy" />
              </Link>
            ))}
            {!isLoading && images.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full">Nenhuma imagem ainda.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
