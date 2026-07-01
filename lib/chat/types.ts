import type { ChartAnalysis } from "@/lib/analysis-types";

/** One in-scope source sent to the chat route (a numbered chart). */
export interface ChatWireSource {
  label: string;
  analysis: ChartAnalysis;
  notes: string;
}

/** Request body for POST /api/chat. */
export interface ChatRequest {
  question: string;
  history: { role: "user" | "assistant"; content: string }[];
  sources: ChatWireSource[];
}
