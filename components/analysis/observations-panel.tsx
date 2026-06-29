import { SectionHeading, StatusDot, Skeleton, EmptyHint } from "@/components/ui/primitives";
import type { Observation } from "@/lib/analysis-types";

/** [4] Observations — key market observations drawn from the chart. */
export function ObservationsPanel({
  observations,
  loading,
}: {
  observations?: Observation[];
  loading?: boolean;
}) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeading index={4} title="Observations" subtitle="Key market observations from the chart." />

      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Row key={i}>
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-3.5 w-3/4" />
            </Row>
          ))}
        </div>
      ) : observations && observations.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {observations.map((obs, i) => (
            <li key={i}>
              <Row tone={obs.tone}>
                <StatusDot tone={obs.tone} />
                <span className="text-[13.5px] leading-snug text-[var(--foreground-secondary)]">
                  {obs.text}
                </span>
              </Row>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyRow>
          <EmptyHint>Upload a chart to generate key market observations.</EmptyHint>
        </EmptyRow>
      )}
    </section>
  );
}

function Row({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: Observation["tone"];
}) {
  const warning = tone === "warning";
  return (
    <div
      className="flex items-center gap-3 rounded-lg border px-4 py-3"
      style={{
        background: warning ? "var(--warning-bg)" : "var(--panel)",
        borderColor: warning ? "var(--warning-border)" : "var(--panel-border)",
      }}
    >
      {children}
    </div>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg border border-dashed px-4 py-5"
      style={{ background: "var(--panel)", borderColor: "var(--panel-border)" }}
    >
      {children}
    </div>
  );
}
