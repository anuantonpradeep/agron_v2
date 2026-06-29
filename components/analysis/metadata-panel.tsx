import { SectionHeading, Panel, Field, EmptyHint } from "@/components/ui/primitives";
import type { ChartMetadata } from "@/lib/analysis-types";

/** [2] Metadata — structured facts about the captured chart. */
export function MetadataPanel({
  metadata,
  loading,
}: {
  metadata?: ChartMetadata;
  loading?: boolean;
}) {
  const has = Boolean(metadata);
  const changeColor =
    metadata?.change.direction === "down" ? "var(--danger)" : "var(--accent)";

  // Idle: no chart analyzed yet and nothing loading.
  if (!has && !loading) {
    return (
      <section className="flex flex-col gap-3">
        <SectionHeading index={2} title="Metadata" />
        <Panel className="border-dashed">
          <EmptyHint>Upload a chart to extract its symbol, timeframe, price and capture details.</EmptyHint>
        </Panel>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading index={2} title="Metadata" />
      <Panel>
        <dl className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
          <div>
            <Field label="Symbol" loading={loading}>
              {metadata?.symbol}
            </Field>
            <Field label="Timeframe" loading={loading}>
              {metadata?.timeframe}
            </Field>
            <Field label="Source" loading={loading}>
              {metadata?.source}
            </Field>
            <Field label="Captured At" loading={loading}>
              {metadata?.capturedAt}
            </Field>
          </div>
          <div>
            <Field label="Current Price" loading={loading}>
              {metadata?.currentPrice}
            </Field>
            <Field label="Change" loading={loading}>
              {metadata ? (
                <span style={{ color: changeColor }}>
                  {metadata.change.absolute} ({metadata.change.percent})
                </span>
              ) : null}
            </Field>
            <Field label="Session" loading={loading}>
              {metadata?.session}
            </Field>
            <Field label="Timezone" loading={loading}>
              {metadata?.timezone}
            </Field>
            <Field label="Chart Type" loading={loading}>
              {metadata?.chartType}
            </Field>
          </div>
        </dl>
      </Panel>
    </section>
  );
}
