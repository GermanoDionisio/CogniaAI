import { createFileRoute } from "@tanstack/react-router";
import { ChatWindow } from "@/components/ChatWindow";

export const Route = createFileRoute("/_authenticated/")({
  component: NewChat,
});

function NewChat() {
  return <ChatWindow threadId={null} />;
}
