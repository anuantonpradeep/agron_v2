import { SectionHeading, Panel, Skeleton, EmptyHint } from "@/components/ui/primitives";
import type { TradeIdeas, TradeScenario } from "@/lib/analysis-types";

/** [7] Trade Ideas (Educational) — possible scenarios to consider. */
export function TradeIdeasPanel({
  tradeIdeas,
  loading,
}: {
  tradeIdeas?: TradeIdeas;
  loading?: boolean;
}) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeading index={7} title="Trade Ideas (Educational)" subtitle="Possible scenarios to consider." />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {loading ? (
          <>
            <ScenarioSkeleton kind="bullish" />
            <ScenarioSkeleton kind="bearish" />
          </>
        ) : tradeIdeas ? (
          <>
            <ScenarioCard kind="bullish" scenario={tradeIdeas.bullish} />
            <ScenarioCard kind="bearish" scenario={tradeIdeas.bearish} />
          </>
        ) : (
          <>
            <EmptyScenario kind="bullish" />
            <EmptyScenario kind="bearish" />
          </>
        )}
      </div>
    </section>
  );
}

function ScenarioCard({
  kind,
  scenario,
}: {
  kind: "bullish" | "bearish";
  scenario: TradeScenario;
}) {
  return (
    <Panel tone={kind === "bullish" ? "positive" : "danger"}>
      <h3
        className="text-[14px] font-semibold"
        style={{ color: kind === "bullish" ? "var(--accent)" : "var(--danger)" }}
      >
        {scenario.title}
      </h3>
      <div className="mt-3 flex flex-col gap-1.5">
        {scenario.lines.map((line, i) => (
          <p key={i} className="text-[13px] leading-relaxed text-[var(--foreground-secondary)]">
            {line}
          </p>
        ))}
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--muted)]">
          <span className="text-[var(--foreground-secondary)]">Invalidation:</span>{" "}
          {scenario.invalidation}
        </p>
      </div>
    </Panel>
  );
}

function ScenarioSkeleton({ kind }: { kind: "bullish" | "bearish" }) {
  return (
    <Panel tone={kind === "bullish" ? "positive" : "danger"}>
      <Skeleton className="h-3.5 w-32" />
      <div className="mt-4 flex flex-col gap-2.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </Panel>
  );
}

function EmptyScenario({ kind }: { kind: "bullish" | "bearish" }) {
  return (
    <Panel className="border-dashed">
      <h3
        className="text-[14px] font-semibold"
        style={{ color: kind === "bullish" ? "var(--accent)" : "var(--danger)" }}
      >
        {kind === "bullish" ? "Bullish Scenario" : "Bearish Scenario"}
      </h3>
      <div className="mt-3">
        <EmptyHint>Upload a chart to outline this scenario.</EmptyHint>
      </div>
    </Panel>
  );
}
