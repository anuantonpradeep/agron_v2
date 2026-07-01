import Anthropic from "@anthropic-ai/sdk";
import type { ChatRequest } from "@/lib/chat/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Agron, an assistant that answers questions about the user's own trading charts.

You are given a numbered list of sources. Each source is one analyzed chart: its structured analysis plus the user's own notes.

Rules:
- Answer using ONLY the information in the provided sources. Do not use outside knowledge or invent data.
- Cite the sources you rely on with bracketed numbers matching their labels, e.g. [1], [2].
- If the sources do not contain enough information to answer, say so plainly and suggest what the user could add.
- Be concise and specific. This is educational, not financial advice.`;

function buildUserContent(sources: ChatRequest["sources"], question: string): string {
  const list = sources
    .map(
      (s, i) =>
        `[${i + 1}] ${s.label}\nStructured analysis: ${JSON.stringify(s.analysis)}\nUser notes: ${
          (s.notes || "").trim() || "(none)"
        }`,
    )
    .join("\n\n");
  return `Sources:\n${list}\n\nQuestion: ${question}`;
}

/**
 * POST /api/chat — grounded, streaming chat over the in-scope chart sources.
 * Streams SSE frames: {type:"thinking"|"text", delta} then [DONE]. Stateless;
 * nothing is persisted.
 */
export async function POST(request: Request) {
  let body: ChatRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  const sources = Array.isArray(body.sources) ? body.sources : [];
  const history = Array.isArray(body.history) ? body.history : [];
  if (!question) return Response.json({ error: "Missing question" }, { status: 400 });
  if (sources.length === 0) return Response.json({ error: "No sources in scope" }, { status: 400 });

  const messages: Anthropic.MessageParam[] = [
    ...history
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: buildUserContent(sources, question) },
  ];

  const encoder = new TextEncoder();
  const sse = (obj: unknown) => encoder.encode(`data: ${JSON.stringify(obj)}\n\n`);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const client = new Anthropic();
        const messageStream = client.messages.stream({
          model: "claude-opus-4-8",
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          thinking: { type: "adaptive", display: "summarized" },
          messages,
        });

        for await (const event of messageStream) {
          if (event.type === "content_block_delta") {
            const delta = event.delta;
            if (delta.type === "text_delta") {
              controller.enqueue(sse({ type: "text", delta: delta.text }));
            } else if (delta.type === "thinking_delta") {
              controller.enqueue(sse({ type: "thinking", delta: delta.thinking }));
            }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        console.error("chat failed", err);
        controller.enqueue(
          sse({ type: "error", message: "Chat failed. Check ANTHROPIC_API_KEY / credits and server logs." }),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
