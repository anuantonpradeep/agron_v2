import { AnalysisView } from "@/components/analysis/analysis-view";

/**
 * Memory detail / new-analysis screen.
 *
 * Selecting/dropping charts shows each preview immediately and analyzes each
 * one independently (image → /api/analyze → ChartAnalysis). The selected chart
 * drives the eight panels: empty before analysis, loading while analyzing,
 * populated when done. Nothing is uploaded or persisted.
 *
 * Requires ANTHROPIC_API_KEY — see .env.local.example.
 */
export default function Home() {
  return <AnalysisView />;
}
