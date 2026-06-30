import type { MemorySaver, SaveResult } from "./types";
import type { ChartAnalysis } from "@/lib/analysis-types";

/**
 * Default saver: builds the Memory document (notes nested inside the analysis)
 * and POSTs it with the image to /api/memories, which writes both to S3.
 */
export function createMemorySaver(): MemorySaver {
  return {
    async save({ id, file, analysis, notes }): Promise<SaveResult> {
      // Notes live inside the analysis in the persisted document.
      const memory = {
        schemaVersion: 1,
        id,
        analysis: { ...analysis, notes } as ChartAnalysis & { notes: string },
        image: {
          originalFilename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        },
      };

      const form = new FormData();
      form.append("image", file);
      form.append("memory", JSON.stringify(memory));

      const res = await fetch("/api/memories", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.id) {
        throw new Error(data?.error ?? `Save failed (${res.status})`);
      }
      return data as SaveResult;
    },
  };
}
