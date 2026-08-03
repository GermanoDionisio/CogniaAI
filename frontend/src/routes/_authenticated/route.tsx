import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/AppSidebar";
import { CogniaLogo } from "@/components/CogniaLogo";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AppSidebar open={open} onClose={() => setOpen(false)} />
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden flex items-center gap-3 px-3 h-14 border-b border-border/50 bg-background/80 backdrop-blur-xl shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-lg hover:bg-sidebar-accent"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <CogniaLogo />
        </header>
        <Outlet />
      </main>
    </div>
  );
}
