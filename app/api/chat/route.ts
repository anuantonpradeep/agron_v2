import Anthropic from "@anthropic-ai/sdk";
import { cookies } from "next/headers";
import { decodeSession, SESSION_COOKIE } from "@/lib/auth/session";
import { loadCatalog } from "@/lib/memories/catalog";
import { getObjectJson } from "@/lib/aws/s3";
import type { StoredMemory } from "@/lib/memories/catalog";
import type { ChatRequest, ChatSourceRef, SourceOrigin } from "@/lib/chat/types";
import type { ChartAnalysis } from "@/lib/analysis-types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_SOURCES = 12;

const SELECT_SYSTEM = `You choose which of the user's charts are relevant to their question.
Return the ids of every chart that could help answer it. For questions about tendencies, biases, comparisons, or "why" a decision was good or poor, include multiple comparable charts, not just one. If none are relevant, return an empty list.`;

const ANSWER_SYSTEM = `You are Agron, the user's trading "second brain". You answer using ONLY the provided sources — each source is one chart's structured analysis plus the user's own notes.

- Explain your reasoning clearly and directly.
- When asked why a decision/entry was good or poor, or about the user's tendencies or biases, identify patterns across the provided sources and notes — but assert only what the evidence supports, and cite the sources [n] that show it. Hedge interpretive claims ("this suggests…").
- If the sources don't contain enough to answer, say so plainly and suggest what to analyze or save. Never use outside knowledge or invent data.
- Educational, not financial advice.`;

const SELECT_TOOL = {
  name: "select_relevant_charts",
  description: "Return the ids of the charts relevant to the question.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: { ids: { type: "array", items: { type: "string" } } },
    required: ["ids"],
  },
} as const;

interface Candidate {
  id: string;
  origin: SourceOrigin;
  label: string;
  line: string; // compact catalog line for selection
}

export async function POST(request: Request) {
  const store = await cookies();
  const session = await decodeSession(store.get(SESSION_COOKIE)?.value);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.sub;

  let body: ChatRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const history = Array.isArray(body.history) ? body.history : [];
  const sessionCharts = Array.isArray(body.sessionCharts) ? body.sessionCharts : [];
  if (!question) return Response.json({ error: "Missing question" }, { status: 400 });

  const encoder = new TextEncoder();
  const sse = (obj: unknown) => encoder.encode(`data: ${JSON.stringify(obj)}\n\n`);
  const client = new Anthropic();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // ── Build the candidate pool: session charts + saved catalog ──
        const byId = new Map<string, Candidate>();
        const sessionFull = new Map<string, { analysis: ChartAnalysis; notes: string; label: string }>();
        for (const c of sessionCharts) {
          if (!c?.id || byId.has(c.id)) continue;
          byId.set(c.id, { id: c.id, origin: "session", label: c.label, line: sessionLine(c) });
          sessionFull.set(c.id, { analysis: c.analysis, notes: c.notes, label: c.label });
        }
        const catalog = await loadCatalog(userId);
        for (const e of catalog) {
          if (byId.has(e.id)) continue; // session copy wins
          byId.set(e.id, { id: e.id, origin: "saved", label: e.symbol, line: savedLine(e) });
        }

        if (byId.size === 0) {
          controller.enqueue(sse({ type: "sources", sources: [] }));
          controller.enqueue(sse({ type: "text", delta: "You don't have any analyzed or saved charts yet. Analyze or save a chart, then ask again." }));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          return;
        }

        // ── Phase 1: select relevant ids ──
        const selectRes = await client.messages.create({
          model: "claude-opus-4-8",
          max_tokens: 1024,
          system: SELECT_SYSTEM,
          tools: [SELECT_TOOL as never],
          tool_choice: { type: "tool", name: SELECT_TOOL.name },
          messages: [
            {
              role: "user",
              content: `Question: ${question}\n\nCandidates:\n${[...byId.values()].map((c) => c.line).join("\n")}`,
            },
          ],
        });
        const toolUse = selectRes.content.find((b) => b.type === "tool_use");
        const rawIds =
          toolUse && toolUse.type === "tool_use" && Array.isArray((toolUse.input as { ids?: unknown }).ids)
            ? ((toolUse.input as { ids: unknown[] }).ids.filter((x) => typeof x === "string") as string[])
            : [];
        const selectedIds = rawIds.filter((id) => byId.has(id)).slice(0, MAX_SOURCES);

        // ── Fetch fulls for the selected ids ──
        const refs: ChatSourceRef[] = [];
        const blocks: string[] = [];
        for (const id of selectedIds) {
          const cand = byId.get(id)!;
          let analysis: (ChartAnalysis & { notes?: string }) | undefined;
          let notes = "";
          if (cand.origin === "session") {
            const full = sessionFull.get(id);
            analysis = full?.analysis;
            notes = full?.notes ?? "";
          } else {
            const mem = await getObjectJson<StoredMemory>(`users/${userId}/memories/${id}/memory.json`);
            analysis = mem?.analysis;
            notes = mem?.analysis?.notes ?? "";
          }
          if (!analysis) continue;
          const n = refs.length + 1;
          refs.push({ id, label: cand.label, origin: cand.origin });
          blocks.push(
            `[${n}] ${cand.label} (${cand.origin})\nAnalysis: ${JSON.stringify(analysis)}\nUser notes: ${notes.trim() || "(none)"}`,
          );
        }

        controller.enqueue(sse({ type: "sources", sources: refs }));

        if (blocks.length === 0) {
          controller.enqueue(sse({ type: "text", delta: "I couldn't find anything relevant in your current or saved charts for that. Try rephrasing, or analyze/save a chart that covers it." }));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          return;
        }

        // ── Phase 2: grounded, reflective answer (streamed) ──
        const messages: Anthropic.MessageParam[] = [
          ...history
            .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
            .map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: `Sources:\n${blocks.join("\n\n")}\n\nQuestion: ${question}` },
        ];

        const answer = client.messages.stream({
          model: "claude-opus-4-8",
          max_tokens: 4096,
          system: ANSWER_SYSTEM,
          thinking: { type: "adaptive", display: "summarized" },
          messages,
        });
        for await (const event of answer) {
          if (event.type === "content_block_delta") {
            const delta = event.delta;
            if (delta.type === "text_delta") controller.enqueue(sse({ type: "text", delta: delta.text }));
            else if (delta.type === "thinking_delta") controller.enqueue(sse({ type: "thinking", delta: delta.thinking }));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        console.error("chat failed", err);
        controller.enqueue(sse({ type: "error", message: "Chat failed. Check ANTHROPIC_API_KEY / credits and server logs." }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform" },
  });
}

function sessionLine(c: { id: string; label: string; analysis: ChartAnalysis; notes: string }): string {
  const a = c.analysis;
  const concepts = (a?.concepts ?? []).map((x) => x.label).join(", ");
  return `id: ${c.id} | source: session | ${c.label} ${a?.metadata?.timeframe ?? ""} | bias: ${a?.marketContext?.overallBias ?? ""} | phase: ${a?.marketContext?.phase ?? ""} | concepts: ${concepts} | notes: ${(c.notes || "").slice(0, 160)}`;
}

function savedLine(e: {
  id: string;
  symbol: string;
  timeframe: string;
  bias: string;
  phase: string;
  concepts: string[];
  summary: string;
  notes: string;
}): string {
  return `id: ${e.id} | source: saved | ${e.symbol} ${e.timeframe} | bias: ${e.bias} | phase: ${e.phase} | concepts: ${e.concepts.join(", ")} | summary: ${e.summary} | notes: ${e.notes}`;
}
