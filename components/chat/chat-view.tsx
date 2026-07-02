"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useChartQueueContext } from "@/components/providers/chart-queue-provider";
import { streamChat } from "@/lib/chat/stream-chat";
import { loadChat, saveChat } from "@/lib/chat/chat-storage";
import { useDictation } from "@/components/analysis/use-dictation";
import type { ChartItem } from "@/lib/upload/types";
import type { ChatMessage } from "@/lib/chat/types";

function labelOf(item: ChartItem): string {
  return item.analysis?.metadata?.symbol?.trim() || item.file.name;
}

/**
 * Cursor-style split: workbench (search status + provenance) left, chat right.
 * Agron auto-searches the current session's analyzed charts AND everything the
 * user has saved (S3), retrieves the relevant ones, and answers grounded in
 * them. The conversation persists across refresh (localStorage).
 */
export function ChatView() {
  const queue = useChartQueueContext();
  const analyzed = queue.items.filter((it) => it.status === "analyzed" && it.analysis);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [reindex, setReindex] = useState<"idle" | "syncing" | "done" | "failed">("idle");
  const hydratedRef = useRef(false);

  // Restore the conversation once, on mount.
  useEffect(() => {
    const persisted = loadChat();
    if (persisted) {
      let restored = persisted.messages;
      const last = restored[restored.length - 1];
      if (last && last.role === "assistant" && !last.content.trim()) restored = restored.slice(0, -1);
      setMessages(restored);
    }
    hydratedRef.current = true;
  }, []);

  // Persist (debounced) after hydration.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const timer = setTimeout(() => saveChat({ messages }), 400);
    return () => clearTimeout(timer);
  }, [messages]);

  const { supported: micSupported, listening, start: micStart, stop: micStop } = useDictation((chunk) =>
    setInput((prev) => (prev.trim() ? `${prev.trim()} ${chunk}` : chunk)),
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const canSend = !streaming && input.trim().length > 0;

  function updateLastAssistant(fn: (m: ChatMessage) => ChatMessage) {
    setMessages((prev) => {
      const copy = [...prev];
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].role === "assistant") {
          copy[i] = fn(copy[i]);
          break;
        }
      }
      return copy;
    });
  }

  async function send() {
    const question = input.trim();
    if (!question || streaming) return;

    const sessionCharts = analyzed.map((it) => ({
      id: it.id,
      label: labelOf(it),
      analysis: it.analysis!,
      notes: it.notes,
    }));
    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    setInput("");
    if (listening) micStop();
    setMessages((prev) => [
      ...prev,
      { role: "user", content: question },
      { role: "assistant", content: "", reasoning: "" },
    ]);
    setStreaming(true);

    try {
      await streamChat(
        { question, history, sessionCharts },
        {
          onSources: (sources) => updateLastAssistant((m) => ({ ...m, sources })),
          onText: (d) => updateLastAssistant((m) => ({ ...m, content: m.content + d })),
          onThinking: (d) => updateLastAssistant((m) => ({ ...m, reasoning: (m.reasoning ?? "") + d })),
        },
      );
    } catch (e) {
      updateLastAssistant((m) => ({
        ...m,
        content: m.content || (e instanceof Error ? e.message : "Chat failed."),
        error: true,
      }));
    } finally {
      setStreaming(false);
    }
  }

  async function syncSaved() {
    setReindex("syncing");
    try {
      const res = await fetch("/api/memories/reindex", { method: "POST" });
      setReindex(res.ok ? "done" : "failed");
    } catch {
      setReindex("failed");
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const citedNums = lastAssistant
    ? new Set(Array.from(lastAssistant.content.matchAll(/\[(\d+)\]/g)).map((x) => Number(x[1])))
    : new Set<number>();

  return (
    <div className="grid h-[calc(100vh-3rem)] grid-cols-1 lg:grid-cols-[3fr_2fr]">
      {/* Workbench */}
      <section
        className="overflow-y-auto border-b px-6 py-6 lg:border-b-0 lg:border-r"
        style={{ borderColor: "var(--panel-border)" }}
      >
        <h2 className="text-[15px] font-semibold text-[var(--foreground)]">Your memory</h2>
        <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--muted)]">
          Ask anything. Agron searches this session&apos;s {analyzed.length} analyzed chart
          {analyzed.length === 1 ? "" : "s"} and everything you&apos;ve saved, then answers grounded only
          in what it finds.
        </p>

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={syncSaved}
            disabled={reindex === "syncing"}
            className="rounded-md border px-2.5 py-1 text-[12px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] disabled:opacity-50"
            style={{ borderColor: "var(--panel-border)" }}
          >
            {reindex === "syncing" ? "Syncing…" : "Sync saved memories"}
          </button>
          {reindex === "done" ? <span className="text-[12px] text-[var(--accent)]">Index updated ✓</span> : null}
          {reindex === "failed" ? <span className="text-[12px] text-[var(--danger)]">Sync failed</span> : null}
        </div>

        {lastAssistant?.sources?.length ? (
          <div className="mt-8 border-t pt-6" style={{ borderColor: "var(--panel-border)" }}>
            <h3 className="text-[14px] font-semibold text-[var(--foreground)]">How this answer was assembled</h3>
            <ul className="mt-3 flex flex-col gap-1.5">
              {lastAssistant.sources.map((s, i) => {
                const n = i + 1;
                const cited = citedNums.has(n);
                return (
                  <li key={`${s.id}-${i}`} className="flex items-center gap-2 text-[13px]">
                    <span
                      className="inline-flex h-5 min-w-5 items-center justify-center rounded border px-1 text-[11px] font-medium"
                      style={
                        cited
                          ? { color: "var(--accent)", background: "var(--accent-bg)", borderColor: "var(--accent-border)" }
                          : { color: "var(--muted)", background: "transparent", borderColor: "var(--panel-border)" }
                      }
                    >
                      {n}
                    </span>
                    <span className="min-w-0 truncate" style={{ color: cited ? "var(--foreground)" : "var(--muted)" }}>
                      {s.label}
                    </span>
                    <span className="text-[11px] text-[var(--muted-light)]">
                      {s.origin === "saved" ? "saved" : "session"}
                      {cited ? "" : " · not cited"}
                    </span>
                  </li>
                );
              })}
            </ul>

            {lastAssistant.reasoning?.trim() ? (
              <details className="mt-4">
                <summary className="cursor-pointer text-[13px] font-medium text-[var(--violet)]">Reasoning</summary>
                <p className="mt-2 whitespace-pre-wrap text-[12.5px] leading-relaxed text-[var(--foreground-secondary)]">
                  {lastAssistant.reasoning}
                </p>
              </details>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* Chat */}
      <section className="flex min-h-0 flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="max-w-sm text-center text-[13px] text-[var(--muted)]">
                Ask about your charts — e.g. &ldquo;why was my NAS100 entry not the best?&rdquo; or &ldquo;what
                biases show up in my setups?&rdquo; Answers come only from your analyzed and saved charts.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((m, i) => (
                <MessageBubble key={i} message={m} streaming={streaming} isLast={i === messages.length - 1} />
              ))}
            </div>
          )}
        </div>

        <div className="border-t px-4 py-3" style={{ borderColor: "var(--panel-border)" }}>
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={streaming}
              rows={2}
              placeholder="Ask anything about your charts…"
              className="w-full resize-none rounded-xl border p-3 pr-24 text-[13.5px] leading-relaxed text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-light)] focus:border-[var(--violet-border)] disabled:opacity-50"
              style={{ background: "var(--panel)", borderColor: "var(--panel-border)" }}
            />
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
              {micSupported ? (
                <button
                  type="button"
                  onClick={listening ? micStop : micStart}
                  aria-label={listening ? "Stop dictation" : "Dictate"}
                  className="flex h-8 w-8 items-center justify-center rounded-full border transition-colors"
                  style={
                    listening
                      ? { color: "var(--danger)", background: "var(--danger-bg)", borderColor: "var(--danger-border)" }
                      : { color: "var(--violet)", background: "var(--violet-bg)", borderColor: "var(--violet-border)" }
                  }
                >
                  <MicIcon />
                </button>
              ) : null}
              <button
                type="button"
                onClick={send}
                disabled={!canSend}
                className="rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-40"
                style={{ color: "var(--accent-foreground, #0a1a12)", background: "var(--accent)" }}
              >
                Send
              </button>
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-[var(--muted-light)]">
            Grounded only in your charts — current session + saved memories.
          </p>
        </div>
      </section>
    </div>
  );
}

function MessageBubble({
  message,
  streaming,
  isLast,
}: {
  message: ChatMessage;
  streaming: boolean;
  isLast: boolean;
}) {
  const isUser = message.role === "user";
  const showThinking = !isUser && !message.content && streaming && isLast;
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[85%] rounded-xl border px-4 py-2.5 text-[13.5px] leading-relaxed"
        style={
          isUser
            ? { background: "var(--violet-bg)", borderColor: "var(--violet-border)", color: "var(--foreground)" }
            : message.error
              ? { background: "var(--danger-bg)", borderColor: "var(--danger-border)", color: "var(--danger)" }
              : { background: "var(--panel)", borderColor: "var(--panel-border)", color: "var(--foreground-secondary)" }
        }
      >
        <p className="whitespace-pre-wrap">{message.content || (showThinking ? "Searching your memory…" : "")}</p>
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
