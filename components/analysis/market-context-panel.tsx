import { SectionHeading, Panel, BiasBadge, Skeleton, EmptyHint } from "@/components/ui/primitives";
import type { MarketContext } from "@/lib/analysis-types";

/** [3] Market Context — trend, bias, structure and phase. */
export function MarketContextPanel({
  context,
  loading,
}: {
  context?: MarketContext;
  loading?: boolean;
}) {
  // Idle: no chart analyzed yet and nothing loading.
  if (!context && !loading) {
    return (
      <section className="flex flex-col gap-3">
        <SectionHeading index={3} title="Market Context" />
        <Panel className="border-dashed">
          <EmptyHint>Upload a chart to determine trend, bias, structure and market phase.</EmptyHint>
        </Panel>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading index={3} title="Market Context" />
      <Panel>
        <dl className="grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2">
          <ContextRow label={context?.trendLabel ?? "Trend (Higher High / Higher Low)"} loading={loading}>
            {context ? <BiasBadge bias={context.trend} /> : null}
          </ContextRow>
          <ContextRow label="Structure" loading={loading}>
            {context ? (
              <span className="text-[13px] font-medium text-[var(--foreground)]">
                {context.structure}
              </span>
            ) : null}
          </ContextRow>
          <ContextRow label="Overall Bias" loading={loading}>
            {context ? <BiasBadge bias={context.overallBias} /> : null}
          </ContextRow>
          <ContextRow label="Phase" loading={loading}>
            {context ? (
              <span className="text-[13px] font-medium text-[var(--foreground)]">
                {context.phase}
              </span>
            ) : null}
          </ContextRow>
        </dl>
      </Panel>
    </section>
  );
}

function ContextRow({
  label,
  children,
  loading,
}: {
  label: string;
  children?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[13px] text-[var(--muted)]">{label}</dt>
      <dd className="flex items-center">
        {loading ? <Skeleton className="h-5 w-20 rounded-md" /> : children}
      </dd>
    </div>
  );
}
