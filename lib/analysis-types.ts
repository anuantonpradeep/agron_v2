/**
 * Structured shape of a chart analysis produced by the backend.
 *
 * Every field is optional so the UI can render empty / loading states for any
 * section that has not yet been populated. The frontend never invents these
 * values — they are filled in once the backend analysis completes.
 */

export type Tone = "positive" | "warning" | "info" | "neutral";
export type Bias = "BULLISH" | "BEARISH" | "NEUTRAL";

/** [2] Metadata about the captured chart. */
export interface ChartMetadata {
  symbol: string;
  timeframe: string;
  source: string;
  capturedAt: string;
  currentPrice: string;
  change: {
    /** e.g. "+353.3" */
    absolute: string;
    /** e.g. "+1.22%" */
    percent: string;
    direction: "up" | "down" | "flat";
  };
  session: string;
  timezone: string;
  chartType: string;
}

/** [3] High-level market context. */
export interface MarketContext {
  /** Label for the trend row, e.g. "Trend (Higher High / Higher Low)". */
  trendLabel: string;
  trend: Bias;
  overallBias: Bias;
  structure: string;
  phase: string;
}

/** [4] A single market observation drawn from the chart. */
export interface Observation {
  text: string;
  tone: Tone;
}

/** [5] Interpretation — what the chart is telling us. */
export interface Interpretation {
  paragraphs: string[];
}

/** [6] A piece of evidence supporting the interpretation. */
export interface EvidenceItem {
  label: string;
  tone: Tone;
  description: string;
}

/** [7] An educational trade scenario. */
export interface TradeScenario {
  title: string;
  /** Ordered narrative lines (not invalidation). */
  lines: string[];
  /** Invalidation condition, rendered with emphasis. */
  invalidation: string;
}

export interface TradeIdeas {
  bullish: TradeScenario;
  bearish: TradeScenario;
}

/** [8] A concept / tag associated with the analysis. */
export interface Concept {
  label: string;
}

/** The full analysis payload for one uploaded chart (a "Memory"). */
export interface ChartAnalysis {
  metadata?: ChartMetadata;
  marketContext?: MarketContext;
  observations?: Observation[];
  interpretation?: Interpretation;
  evidence?: EvidenceItem[];
  tradeIdeas?: TradeIdeas;
  concepts?: Concept[];
}

/** Lifecycle of the analysis for the uploaded chart. */
export type AnalysisStatus = "idle" | "analyzing" | "complete" | "failed";
