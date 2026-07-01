import { ChatView } from "@/components/chat/chat-view";

/**
 * Ask — natural-language Q&A grounded in the current session's analyzed charts.
 * Cursor-style split: sources + provenance on the left, conversation on the
 * right. Nothing is persisted.
 */
export default function ChatPage() {
  return <ChatView />;
}
