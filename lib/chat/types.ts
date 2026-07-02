import type { ChartAnalysis } from "@/lib/analysis-types";

/** A current-session chart the client sends as a retrieval candidate. */
export interface SessionChart {
  id: string;
  label: string;
  analysis: ChartAnalysis;
  notes: string;
}

/** Request body for POST /api/chat. The route also searches saved memories. */
export interface ChatRequest {
  question: string;
  history: { role: "user" | "assistant"; content: string }[];
  sessionCharts: SessionChart[];
}

/** Where a retrieved source came from. */
export type SourceOrigin = "session" | "saved";

/** A source the answer drew on (shown in the provenance panel). */
export interface ChatSourceRef {
  id: string;
  label: string;
  origin?: SourceOrigin;
}

/** One message in the conversation (persisted across refresh). */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  sources?: ChatSourceRef[];
  error?: boolean;
}
