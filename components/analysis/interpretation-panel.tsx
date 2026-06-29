import { SectionHeading, Panel, Skeleton, EmptyHint } from "@/components/ui/primitives";
import type { Interpretation } from "@/lib/analysis-types";

/** [5] Interpretation — what the chart is telling us. */
export function InterpretationPanel({
  interpretation,
  loading,
}: {
  interpretation?: Interpretation;
  loading?: boolean;
}) {
  const has = interpretation && interpretation.paragraphs.length > 0;

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading index={5} title="Interpretation" subtitle="What this chart is telling us." />

      {loading ? (
        <Panel tone="positive">
          <div className="flex flex-col gap-2.5">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-11/12" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
        </Panel>
      ) : has ? (
        <Panel tone="positive">
          <div className="flex flex-col gap-2.5">
            {interpretation!.paragraphs.map((p, i) => (
              <p key={i} className="text-[13.5px] leading-relaxed text-[var(--foreground-secondary)]">
                {p}
              </p>
            ))}
          </div>
        </Panel>
      ) : (
        <Panel className="border-dashed">
          <EmptyHint>Upload a chart to generate an interpretation of the price action.</EmptyHint>
        </Panel>
      )}
    </section>
  );
}
