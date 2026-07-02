import type { ChatRequest, ChatSourceRef } from "./types";

/**
 * POST a question to /api/chat and consume the SSE stream, calling handlers as
 * the retrieved sources, then reasoning (thinking) and text deltas arrive.
 * Resolves when the stream ends.
 */
export async function streamChat(
  req: ChatRequest,
  handlers: {
    onSources: (sources: ChatSourceRef[]) => void;
    onText: (delta: string) => void;
    onThinking: (delta: string) => void;
    signal?: AbortSignal;
  },
): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
    signal: handlers.signal,
  });
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Chat failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep).trim();
      buffer = buffer.slice(sep + 2);
      if (!frame.startsWith("data:")) continue;
      const data = frame.slice(5).trim();
      if (data === "[DONE]") return;
      let obj: { type?: string; delta?: string; message?: string; sources?: ChatSourceRef[] };
      try {
        obj = JSON.parse(data);
      } catch {
        continue;
      }
      if (obj.type === "sources") handlers.onSources(obj.sources ?? []);
      else if (obj.type === "text" && obj.delta) handlers.onText(obj.delta);
      else if (obj.type === "thinking" && obj.delta) handlers.onThinking(obj.delta);
      else if (obj.type === "error") throw new Error(obj.message ?? "Chat failed");
    }
  }
}
