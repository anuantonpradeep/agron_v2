import type { ChartAnalyzer } from "./types";
import type { ChartAnalysis } from "@/lib/analysis-types";

/**
 * Default analyzer: POSTs the image to the stateless /api/analyze route and
 * returns the structured analysis. Nothing is stored client- or server-side.
 */
export function createChartAnalyzer(): ChartAnalyzer {
  return {
    async analyze(file: File, { signal }: { signal?: AbortSignal } = {}): Promise<ChartAnalysis> {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/analyze", { method: "POST", body: form, signal });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.analysis) {
        throw new Error(data?.error ?? `Analysis failed (${res.status})`);
      }
      return data.analysis as ChartAnalysis;
    },
  };
}
