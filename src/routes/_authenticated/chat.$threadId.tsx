import { createFileRoute, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getConversation } from "@/lib/conversations.functions";
import { ChatWindow } from "@/components/ChatWindow";
import type { UIMessage } from "ai";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  component: ChatPage,
  errorComponent: ({ error }) => (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Não foi possível abrir a conversa</h2>
        <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-muted-foreground">Conversa não encontrada.</p>
    </div>
  ),
});

function ChatPage() {
  const { threadId } = Route.useParams();
  const getFn = useServerFn(getConversation);
  const { data } = useSuspenseQuery({
    queryKey: ["conversation", threadId],
    queryFn: () => getFn({ data: { id: threadId } }),
  });
  if (!data) throw notFound();

  // Reconstruct UIMessages from persisted rows
  const initialMessages: UIMessage[] = data.messages.map((m) => {
    const stored = (m.message_data as UIMessage | null) ?? null;
    if (stored && stored.parts) return { ...stored, id: m.id };
    return {
      id: m.id,
      role: m.role as UIMessage["role"],
      parts: [{ type: "text", text: m.content }],
    } as UIMessage;
  });

  return <ChatWindow threadId={threadId} initialMessages={initialMessages} initialTitle={data.conversation.title} />;
}
