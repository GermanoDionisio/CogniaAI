import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LibraryFile = {
  messageId: string;
  conversationId: string;
  filename: string;
  mediaType: string;
  url: string;
  createdAt: string;
};

export const getLibrary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: conversations, error } = await context.supabase
      .from("conversations")
      .select("id,title,favorite,updated_at,created_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: msgs, error: mErr } = await context.supabase
      .from("messages")
      .select("id,conversation_id,message_data,created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (mErr) throw new Error(mErr.message);

    const files: LibraryFile[] = [];
    for (const m of msgs ?? []) {
      const data = m.message_data as { parts?: Array<Record<string, unknown>> } | null;
      for (const p of data?.parts ?? []) {
        if (p.type === "file" && typeof p.url === "string") {
          files.push({
            messageId: m.id,
            conversationId: m.conversation_id,
            filename: (p.filename as string) ?? "arquivo",
            mediaType: (p.mediaType as string) ?? "application/octet-stream",
            url: p.url as string,
            createdAt: m.created_at,
          });
        }
      }
    }

    return { conversations: conversations ?? [], files };
  });
