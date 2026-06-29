"use client";

import type { ChartAnalysis, AnalysisStatus } from "@/lib/analysis-types";
import type { Uploader } from "@/lib/upload/types";
import { useUploadQueue } from "@/lib/upload/use-upload-queue";
import { OriginalChart } from "./original-chart";
import { MetadataPanel } from "./metadata-panel";
import { MarketContextPanel } from "./market-context-panel";
import { ObservationsPanel } from "./observations-panel";
import { InterpretationPanel } from "./interpretation-panel";
import { EvidencePanel } from "./evidence-panel";
import { TradeIdeasPanel } from "./trade-ideas-panel";
import { TagsConceptsPanel } from "./tags-concepts-panel";

/**
 * Chart analysis screen (one "Memory").
 *
 * Upload is real (see `useUploadQueue`); analysis is still prop-driven so the
 * backend can hydrate it later:
 *  - `analysis` carries the structured result once available.
 *  - `status` optionally overrides the derived analysis lifecycle.
 *  - `uploader` injects the storage implementation (defaults to a browser-only
 *    uploader; pass an S3 uploader later with no other changes).
 *
 * With no `analysis`, sections render empty states; once the selected chart has
 * finished uploading they render loading states, ready for the backend.
 */
export function AnalysisView({
  analysis,
  status,
  uploader,
}: {
  analysis?: ChartAnalysis;
  status?: AnalysisStatus;
  uploader?: Uploader;
}) {
  const queue = useUploadQueue(uploader);

  // Analysis begins only after the selected chart has finished uploading.
  const selectedUploaded = queue.selected?.status === "uploaded";
  const effectiveStatus: AnalysisStatus =
    status ?? (analysis ? "complete" : selectedUploaded ? "analyzing" : "idle");
  const loading = effectiveStatus === "analyzing";

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1480px] px-6 py-8 lg:px-10">
      <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-2">
        {/* Left column — chart + facts */}
        <div className="flex flex-col gap-10">
          <OriginalChart
            items={queue.items}
            selected={queue.selected}
            onAddFiles={queue.addFiles}
            onSelect={queue.select}
            onRemove={queue.remove}
          />
          <MetadataPanel metadata={analysis?.metadata} loading={loading} />
          <MarketContextPanel context={analysis?.marketContext} loading={loading} />
        </div>

        {/* Right column — analysis */}
        <div className="flex flex-col gap-10">
          <ObservationsPanel observations={analysis?.observations} loading={loading} />
          <InterpretationPanel interpretation={analysis?.interpretation} loading={loading} />
          <EvidencePanel evidence={analysis?.evidence} loading={loading} />
          <TradeIdeasPanel tradeIdeas={analysis?.tradeIdeas} loading={loading} />
          <TagsConceptsPanel concepts={analysis?.concepts} loading={loading} />
        </div>
      </div>
    </main>
  );
}
