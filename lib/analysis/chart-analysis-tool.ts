/**
 * Tool the model is forced to call. Its input_schema mirrors `ChartAnalysis`
 * so the model returns structured JSON we validate and hand to the UI. We
 * validate the result ourselves (`lib/analysis/validate.ts`), so this schema is
 * guidance for the model.
 */

const TONE = { type: "string", enum: ["positive", "warning", "info", "neutral"] };
const BIAS = { type: "string", enum: ["BULLISH", "BEARISH", "NEUTRAL"] };

export const CHART_ANALYSIS_TOOL = {
  name: "submit_chart_analysis",
  description:
    "Submit the structured analysis of the trading chart. Base every field strictly on what is visible in the chart image; do not invent values you cannot read.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      metadata: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string" },
          timeframe: { type: "string" },
          source: { type: "string" },
          capturedAt: { type: "string" },
          currentPrice: { type: "string" },
          change: {
            type: "object",
            additionalProperties: false,
            properties: {
              absolute: { type: "string" },
              percent: { type: "string" },
              direction: { type: "string", enum: ["up", "down", "flat"] },
            },
            required: ["absolute", "percent", "direction"],
          },
          session: { type: "string" },
          timezone: { type: "string" },
          chartType: { type: "string" },
        },
        required: [
          "symbol",
          "timeframe",
          "source",
          "capturedAt",
          "currentPrice",
          "change",
          "session",
          "timezone",
          "chartType",
        ],
      },
      marketContext: {
        type: "object",
        additionalProperties: false,
        properties: {
          trendLabel: { type: "string" },
          trend: BIAS,
          overallBias: BIAS,
          structure: { type: "string" },
          phase: { type: "string" },
        },
        required: ["trendLabel", "trend", "overallBias", "structure", "phase"],
      },
      observations: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: { text: { type: "string" }, tone: TONE },
          required: ["text", "tone"],
        },
      },
      interpretation: {
        type: "object",
        additionalProperties: false,
        properties: { paragraphs: { type: "array", items: { type: "string" } } },
        required: ["paragraphs"],
      },
      evidence: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            label: { type: "string" },
            tone: TONE,
            description: { type: "string" },
          },
          required: ["label", "tone", "description"],
        },
      },
      tradeIdeas: {
        type: "object",
        additionalProperties: false,
        properties: {
          bullish: { $ref: "#/$defs/scenario" },
          bearish: { $ref: "#/$defs/scenario" },
        },
        required: ["bullish", "bearish"],
      },
      concepts: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: { label: { type: "string" } },
          required: ["label"],
        },
      },
    },
    required: [
      "metadata",
      "marketContext",
      "observations",
      "interpretation",
      "evidence",
      "tradeIdeas",
      "concepts",
    ],
    $defs: {
      scenario: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          lines: { type: "array", items: { type: "string" } },
          invalidation: { type: "string" },
        },
        required: ["title", "lines", "invalidation"],
      },
    },
  },
} as const;
