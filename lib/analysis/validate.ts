import type {
  ChartAnalysis,
  ChartMetadata,
  MarketContext,
  Observation,
  Interpretation,
  EvidenceItem,
  TradeIdeas,
  TradeScenario,
  Concept,
  Tone,
  Bias,
} from "@/lib/analysis-types";

/**
 * Validate the model's tool output into a trusted `ChartAnalysis`.
 *
 * Malformed sections are dropped rather than invented; if nothing usable comes
 * back we throw so the caller can mark the run failed (never fabricate).
 */
export function parseChartAnalysis(input: unknown): ChartAnalysis {
  if (!isRecord(input)) throw new Error("Analysis result is not an object");

  const analysis: ChartAnalysis = {
    metadata: parseMetadata(input.metadata),
    marketContext: parseContext(input.marketContext),
    observations: parseObservations(input.observations),
    interpretation: parseInterpretation(input.interpretation),
    evidence: parseEvidence(input.evidence),
    tradeIdeas: parseTradeIdeas(input.tradeIdeas),
    concepts: parseConcepts(input.concepts),
  };

  const hasContent =
    analysis.metadata ||
    analysis.marketContext ||
    (analysis.observations?.length ?? 0) > 0 ||
    (analysis.interpretation?.paragraphs.length ?? 0) > 0;
  if (!hasContent) throw new Error("Analysis result contained no usable content");

  return analysis;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}
function tone(v: unknown): Tone {
  return v === "positive" || v === "warning" || v === "info" || v === "neutral" ? v : "neutral";
}
function bias(v: unknown): Bias {
  return v === "BULLISH" || v === "BEARISH" || v === "NEUTRAL" ? v : "NEUTRAL";
}

function parseMetadata(v: unknown): ChartMetadata | undefined {
  if (!isRecord(v)) return undefined;
  if (![v.symbol, v.timeframe, v.currentPrice].some((x) => str(x))) return undefined;
  const change = isRecord(v.change) ? v.change : {};
  const direction = change.direction === "down" ? "down" : change.direction === "flat" ? "flat" : "up";
  return {
    symbol: str(v.symbol) ?? "N/A",
    timeframe: str(v.timeframe) ?? "N/A",
    source: str(v.source) ?? "N/A",
    capturedAt: str(v.capturedAt) ?? "N/A",
    currentPrice: str(v.currentPrice) ?? "N/A",
    change: {
      absolute: str(change.absolute) ?? "N/A",
      percent: str(change.percent) ?? "N/A",
      direction,
    },
    session: str(v.session) ?? "N/A",
    timezone: str(v.timezone) ?? "N/A",
    chartType: str(v.chartType) ?? "N/A",
  };
}

function parseContext(v: unknown): MarketContext | undefined {
  if (!isRecord(v)) return undefined;
  return {
    trendLabel: str(v.trendLabel) ?? "Trend",
    trend: bias(v.trend),
    overallBias: bias(v.overallBias),
    structure: str(v.structure) ?? "N/A",
    phase: str(v.phase) ?? "N/A",
  };
}

function parseObservations(v: unknown): Observation[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const items = v
    .map((o): Observation | null => (isRecord(o) && str(o.text) ? { text: str(o.text)!, tone: tone(o.tone) } : null))
    .filter((o): o is Observation => o !== null);
  return items.length ? items : undefined;
}

function parseInterpretation(v: unknown): Interpretation | undefined {
  if (!isRecord(v) || !Array.isArray(v.paragraphs)) return undefined;
  const paragraphs = v.paragraphs.map(str).filter((p): p is string => Boolean(p));
  return paragraphs.length ? { paragraphs } : undefined;
}

function parseEvidence(v: unknown): EvidenceItem[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const items = v
    .map((e): EvidenceItem | null => {
      if (!isRecord(e)) return null;
      const label = str(e.label);
      const description = str(e.description);
      return label && description ? { label, tone: tone(e.tone), description } : null;
    })
    .filter((e): e is EvidenceItem => e !== null);
  return items.length ? items : undefined;
}

function parseScenario(v: unknown, fallbackTitle: string): TradeScenario | null {
  if (!isRecord(v)) return null;
  const lines = Array.isArray(v.lines) ? v.lines.map(str).filter((l): l is string => Boolean(l)) : [];
  const invalidation = str(v.invalidation);
  if (!lines.length && !invalidation) return null;
  return { title: str(v.title) ?? fallbackTitle, lines, invalidation: invalidation ?? "N/A" };
}

function parseTradeIdeas(v: unknown): TradeIdeas | undefined {
  if (!isRecord(v)) return undefined;
  const bullish = parseScenario(v.bullish, "Bullish Scenario");
  const bearish = parseScenario(v.bearish, "Bearish Scenario");
  return bullish && bearish ? { bullish, bearish } : undefined;
}

function parseConcepts(v: unknown): Concept[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const items = v
    .map((c): Concept | null => {
      const label = isRecord(c) ? str(c.label) : str(c);
      return label ? { label } : null;
    })
    .filter((c): c is Concept => c !== null);
  return items.length ? items : undefined;
}
