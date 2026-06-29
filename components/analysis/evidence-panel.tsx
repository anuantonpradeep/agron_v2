import { SectionHeading, ToneChip, Skeleton, EmptyHint, Panel } from "@/components/ui/primitives";
import type { EvidenceItem } from "@/lib/analysis-types";

/** [6] Evidence — why we believe this interpretation. */
export function EvidencePanel({
  evidence,
  loading,
}: {
  evidence?: EvidenceItem[];
  loading?: boolean;
}) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeading index={6} title="Evidence" subtitle="Why we believe this interpretation." />

      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-6 w-36 rounded-md" />
              <Skeleton className="h-3.5 w-1/2" />
            </div>
          ))}
        </div>
      ) : evidence && evidence.length > 0 ? (
        <ul className="flex flex-col gap-2.5">
          {evidence.map((item, i) => (
            <li key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <ToneChip tone={item.tone} variant="outline">
                {item.label}
              </ToneChip>
              <span className="text-[13px] text-[var(--foreground-secondary)]">
                {item.description}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <Panel className="border-dashed">
          <EmptyHint>Upload a chart — supporting evidence will be listed here.</EmptyHint>
        </Panel>
      )}
    </section>
  );
}
