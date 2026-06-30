import type { ChartAnalysis } from "@/lib/analysis-types";

/**
 * Chart-queue types.
 *
 * Each selected/dropped chart becomes a queue item that is analyzed
 * independently. Nothing is uploaded or stored — the image lives only as a
 * browser object URL (preview) and is sent in-flight to the analysis request.
 */

export type ChartItemStatus = "queued" | "analyzing" | "analyzed" | "failed";
export type SaveStatus = "unsaved" | "saving" | "saved" | "failed";

/** One chart in the queue — the single source of truth for a Memory. */
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
  /** The user's own notes for this chart. Sent nested inside the analysis on save. */
  notes: string;
  /** Persistence lifecycle for this chart. */
  saveStatus: SaveStatus;
  /** Populated when `saveStatus === "failed"`. */
  saveError?: string;
}

/** Result of persisting one Memory. */
export interface SaveResult {
  id: string;
  savedAt: string;
  imageKey: string;
}

/**
 * Persists one Memory (image + analysis incl. notes). The UI depends only on
 * this interface, so the storage backend can change without touching the queue
 * or components.
 */
export interface MemorySaver {
  save(memory: {
    id: string;
    file: File;
    analysis: ChartAnalysis;
    notes: string;
  }): Promise<SaveResult>;
}

/**
 * Performs analysis for one chart. The UI depends only on this interface, so
 * the implementation (currently a call to /api/analyze) can change without
 * touching the queue or components.
 */
export interface ChartAnalyzer {
  analyze(file: File, options?: { signal?: AbortSignal }): Promise<ChartAnalysis>;
}
