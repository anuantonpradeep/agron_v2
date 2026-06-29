import { SectionHeading, ToneChip, Skeleton, EmptyHint } from "@/components/ui/primitives";
import type { Concept } from "@/lib/analysis-types";

/** [8] Tags / Concepts — concepts associated with the analysis. */
export function TagsConceptsPanel({
  concepts,
  loading,
}: {
  concepts?: Concept[];
  loading?: boolean;
}) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeading index={8} title="Tags / Concepts" />

      {loading ? (
        <div className="flex flex-wrap gap-2">
          {["w-28", "w-32", "w-24", "w-36", "w-20", "w-24"].map((w, i) => (
            <Skeleton key={i} className={`h-7 rounded-md ${w}`} />
          ))}
        </div>
      ) : concepts && concepts.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {concepts.map((c, i) => (
            <ToneChip key={i} tone="violet" variant="outline">
              {c.label}
            </ToneChip>
          ))}
        </div>
      ) : (
        <EmptyHint>Upload a chart to extract related trading concepts.</EmptyHint>
      )}
    </section>
  );
}
