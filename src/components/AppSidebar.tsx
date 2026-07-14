import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Plus,
  MessageSquare,
  Star,
  FolderOpen,
  Library,
  FileText,
  Image as ImageIcon,
  Settings,
  Search,
  Trash2,
  Sparkles,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { listConversations, deleteConversation, toggleFavorite } from "@/lib/conversations.functions";
import { CogniaLogo } from "@/components/CogniaLogo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function AppSidebar() {
  const list = useServerFn(listConversations);
  const del = useServerFn(deleteConversation);
  const fav = useServerFn(toggleFavorite);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { threadId?: string };
  const activeId = params.threadId;
  const [search, setSearch] = useState("");

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => list(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      if (activeId === id) navigate({ to: "/" });
    },
  });

  const favMut = useMutation({
    mutationFn: (v: { id: string; favorite: boolean }) => fav({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()),
  );
  const favorites = filtered.filter((c) => c.favorite);
  const recent = filtered.filter((c) => !c.favorite);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Você saiu");
    navigate({ to: "/auth" });
  }

  const navItems = [
    { icon: FolderOpen, label: "Projetos" },
    { icon: Library, label: "Biblioteca" },
    { icon: FileText, label: "Documentos" },
    { icon: ImageIcon, label: "Imagens" },
  ];

  return (
    <aside className="w-72 shrink-0 h-screen flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="p-4 border-b border-sidebar-border">
        <CogniaLogo />
      </div>

      <div className="p-3">
        <Link
          to="/"
          className="flex items-center gap-2 w-full rounded-xl px-3 py-2.5 text-sm font-medium transition-all hover:opacity-90"
          style={{ background: "var(--gradient-brand)", color: "white" }}
        >
          <Plus className="w-4 h-4" />
          Nova conversa
        </Link>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conversas..."
            className="w-full text-sm bg-sidebar-accent/60 rounded-lg pl-8 pr-3 py-2 outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/40"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {favorites.length > 0 && (
          <SidebarSection label="Favoritos" icon={Star}>
            {favorites.map((c) => (
              <ThreadItem
                key={c.id}
                id={c.id}
                title={c.title}
                active={activeId === c.id}
                favorite
                onDelete={() => deleteMut.mutate(c.id)}
                onToggleFav={() => favMut.mutate({ id: c.id, favorite: false })}
              />
            ))}
          </SidebarSection>
        )}

        <SidebarSection label="Histórico" icon={MessageSquare}>
          {recent.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-2">Nenhuma conversa ainda.</p>
          )}
          {recent.map((c) => (
            <ThreadItem
              key={c.id}
              id={c.id}
              title={c.title}
              active={activeId === c.id}
              favorite={false}
              onDelete={() => deleteMut.mutate(c.id)}
              onToggleFav={() => favMut.mutate({ id: c.id, favorite: true })}
            />
          ))}
        </SidebarSection>

        <div className="mt-4 border-t border-sidebar-border pt-3">
          {navItems.map((n) => (
            <button
              key={n.label}
              className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent transition-colors"
            >
              <n.icon className="w-4 h-4" />
              {n.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-sidebar-border p-3 space-y-1">
        <button className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent transition-colors">
          <Settings className="w-4 h-4" />
          Configurações
        </button>
        <button
          onClick={signOut}
          className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
        <div className="mt-2 rounded-xl p-3 glass flex items-center gap-2 text-xs">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-foreground">Cognia Free</div>
            <div className="text-muted-foreground">Faça upgrade para Pro</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SidebarSection({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ThreadItem({
  id,
  title,
  active,
  favorite,
  onDelete,
  onToggleFav,
}: {
  id: string;
  title: string;
  active: boolean;
  favorite: boolean;
  onDelete: () => void;
  onToggleFav: () => void;
}) {
  return (
    <div
      className={`group flex items-center gap-1 rounded-lg pr-1 transition-colors ${
        active ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60"
      }`}
    >
      <Link
        to="/chat/$threadId"
        params={{ threadId: id }}
        className="flex-1 min-w-0 px-3 py-2 text-sm truncate"
      >
        {title}
      </Link>
      <button
        onClick={(e) => {
          e.preventDefault();
          onToggleFav();
        }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-sidebar-accent transition"
        aria-label="Favoritar"
      >
        <Star className={`w-3.5 h-3.5 ${favorite ? "fill-primary text-primary" : ""}`} />
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          if (confirm("Excluir esta conversa?")) onDelete();
        }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 hover:text-destructive transition"
        aria-label="Excluir"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
