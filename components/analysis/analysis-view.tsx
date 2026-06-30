"use client";

import { useMemo } from "react";
import type { ChartAnalyzer } from "@/lib/upload/types";
import { useChartQueue } from "@/lib/upload/use-chart-queue";
import { createChartAnalyzer } from "@/lib/upload/analyzer";
import { OriginalChart } from "./original-chart";
import { MetadataPanel } from "./metadata-panel";
import { MarketContextPanel } from "./market-context-panel";
import { ObservationsPanel } from "./observations-panel";
import { InterpretationPanel } from "./interpretation-panel";
import { EvidencePanel } from "./evidence-panel";
import { TradeIdeasPanel } from "./trade-ideas-panel";
import { TagsConceptsPanel } from "./tags-concepts-panel";
import { NotesPanel } from "./notes-panel";

/**
 * Chart analysis screen (one "Memory").
 *
 * Selecting/dropping charts queues each one and analyzes it independently
 * (image → /api/analyze → ChartAnalysis). The selected chart drives the eight
 * panels: empty before analysis, loading while analyzing, populated once done,
 * or an error banner on failure. Nothing is uploaded or persisted.
 */
export function AnalysisView({ analyzer }: { analyzer?: ChartAnalyzer }) {
  const activeAnalyzer = useMemo(() => analyzer ?? createChartAnalyzer(), [analyzer]);
  const queue = useChartQueue(activeAnalyzer);

  const selected = queue.selected;
  const analysis = selected?.analysis;
  const loading = selected?.status === "queued" || selected?.status === "analyzing";
  const failed = selected?.status === "failed";

  // Notes live on the selected item (the single source of truth for its Memory).
  const notes = selected?.notes ?? "";
  const setNotes = (value: string) => {
    if (selected) queue.setNotes(selected.id, value);
  };

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
            onSave={queue.save}
            onSaveAll={queue.saveAll}
          />
          {failed ? (
            <div
              className="rounded-lg border px-4 py-3 text-[13px]"
              style={{ background: "var(--danger-bg)", borderColor: "var(--danger-border)", color: "var(--danger)" }}
            >
              {selected?.error ?? "Analysis failed."}
            </div>
          ) : null}
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
          <NotesPanel value={notes} onChange={setNotes} disabled={!selected} />
        </div>
      </div>
    </main>
  );
}
