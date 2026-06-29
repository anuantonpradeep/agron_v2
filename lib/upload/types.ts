import type { ChartAnalysis } from "@/lib/analysis-types";

/**
 * Chart-queue types.
 *
 * Each selected/dropped chart becomes a queue item that is analyzed
 * independently. Nothing is uploaded or stored — the image lives only as a
 * browser object URL (preview) and is sent in-flight to the analysis request.
 */

export type ChartItemStatus = "queued" | "analyzing" | "analyzed" | "failed";

/** One chart in the queue. */
export interface ChartItem {
  id: string;
  file: File;
  /** Object URL for preview ONLY — revoked on remove/unmount. */
  previewUrl: string;
  status: ChartItemStatus;
  /** Populated once analysis completes. */
  analysis?: ChartAnalysis;
  /** Populated when `status === "failed"`. */
  error?: string;
}

/**
 * Performs analysis for one chart. The UI depends only on this interface, so
 * the implementation (currently a call to /api/analyze) can change without
 * touching the queue or components.
 */
export interface ChartAnalyzer {
  analyze(file: File, options?: { signal?: AbortSignal }): Promise<ChartAnalysis>;
}
