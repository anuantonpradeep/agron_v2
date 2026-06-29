import Anthropic from "@anthropic-ai/sdk";
import { CHART_ANALYSIS_TOOL } from "@/lib/analysis/chart-analysis-tool";
import { parseChartAnalysis } from "@/lib/analysis/validate";

export const runtime = "nodejs";
// Vision analysis takes several seconds; give the function headroom.
export const maxDuration = 60;

const ALLOWED = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024; // Claude vision accepts up to ~5MB/image.

const SYSTEM_PROMPT = `You are an expert technical-analysis assistant for an educational trading product.
You receive a single screenshot of a price chart and produce a structured reading of it.

Rules:
- Base every field strictly on what is visible in the chart. Read the symbol, timeframe, prices, and dates directly off the image.
- If a metadata value is not visible, use "N/A" rather than guessing a number.
- Observations, interpretation, evidence, and trade ideas must follow from the visible price action — do not invent events or levels the chart does not support.
- Trade ideas are educational scenarios, not financial advice.
- Use clear trading terminology (market structure, higher highs/lows, demand/supply zones, etc.).
Return your analysis by calling the submit_chart_analysis tool exactly once.`;

/**
 * POST /api/analyze  (multipart, field "image")
 *
 * Stateless: reads the image from the request, runs Claude vision analysis, and
 * returns the validated ChartAnalysis. Nothing is stored or logged — the image
 * exists only for the duration of this request.
 *
 * NOTE: unauthenticated / dev-only — auth is a later concern.
 */
export async function POST(request: Request) {
  let file: File | null = null;
  try {
    const form = await request.formData();
    const f = form.get("image");
    if (f instanceof File) file = f;
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  if (!file) return Response.json({ error: "Missing image" }, { status: 400 });
  if (!ALLOWED.has(file.type)) {
    return Response.json({ error: "Unsupported image type" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Image too large (max 5MB)" }, { status: 413 });
  }

  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const client = new Anthropic(); // reads ANTHROPIC_API_KEY

    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [CHART_ANALYSIS_TOOL as never],
      tool_choice: { type: "tool", name: CHART_ANALYSIS_TOOL.name },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: file.type as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
                data: base64,
              },
            },
            { type: "text", text: "Analyze this trading chart and submit the structured analysis." },
          ],
        },
      ],
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("Model did not return a chart analysis");
    }

    return Response.json({ analysis: parseChartAnalysis(toolUse.input) });
  } catch (err) {
    console.error("analyze failed", err);
    return Response.json(
      { error: "Analysis failed. Check ANTHROPIC_API_KEY and server logs." },
      { status: 502 },
    );
  }
}
