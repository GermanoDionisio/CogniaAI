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

  // Agrupar recentes por data
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOfDay(now);
  const yesterday = today - 86400000;
  const weekAgo = today - 7 * 86400000;
  const monthAgo = today - 30 * 86400000;

  type Group = { label: string; items: typeof recent };
  const groups: Group[] = [
    { label: "Hoje", items: [] },
    { label: "Ontem", items: [] },
    { label: "Últimos 7 dias", items: [] },
    { label: "Últimos 30 dias", items: [] },
    { label: "Mais antigas", items: [] },
  ];
  for (const c of recent) {
    const t = new Date(c.updated_at ?? c.created_at ?? now).getTime();
    if (t >= today) groups[0].items.push(c);
    else if (t >= yesterday) groups[1].items.push(c);
    else if (t >= weekAgo) groups[2].items.push(c);
    else if (t >= monthAgo) groups[3].items.push(c);
    else groups[4].items.push(c);
  }

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Você saiu");
    navigate({ to: "/auth" });
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={onClose} />
      )}
      <aside
        className={`w-72 shrink-0 h-screen flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-50 transition-transform md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        <CogniaLogo />
        <button onClick={onClose} className="md:hidden p-1 rounded-lg hover:bg-sidebar-accent" aria-label="Fechar menu">
          <X className="w-4 h-4" />
        </button>
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

        {recent.length === 0 && (
          <SidebarSection label="Histórico" icon={MessageSquare}>
            <p className="text-xs text-muted-foreground px-3 py-2">Nenhuma conversa ainda.</p>
          </SidebarSection>
        )}

        {groups.filter((g) => g.items.length > 0).map((g) => (
          <SidebarSection key={g.label} label={g.label} icon={MessageSquare}>
            {g.items.map((c) => (
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
        ))}

        <div className="mt-4 border-t border-sidebar-border pt-3">
          <Link
            to="/library"
            onClick={onClose}
            className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent transition-colors"
            activeProps={{ className: "bg-sidebar-accent text-sidebar-foreground" }}
          >
            <Library className="w-4 h-4" />
            Biblioteca
          </Link>
        </div>
      </div>

      <div className="border-t border-sidebar-border p-3 space-y-1">
        <Link
          to="/settings"
          onClick={onClose}
          className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent transition-colors"
        >
          <Settings className="w-4 h-4" />
          Configurações
        </Link>
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
    </>
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
