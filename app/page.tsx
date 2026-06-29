import { AnalysisView } from "@/components/analysis/analysis-view";

/**
 * Memory detail / new-analysis screen.
 *
 * Upload is real (browser-only for now). No analysis is passed yet, so every
 * analysis section renders its empty state. Selecting/dropping charts shows the
 * preview immediately and runs them through the upload queue; once the selected
 * chart finishes uploading the analysis sections switch to their loading state,
 * ready for the backend to populate `analysis`.
 *
 * To wire up the backend later, lift state here and pass `analysis` + `status`
 * down. To use S3, pass an `uploader` implementing the `Uploader` interface.
 */
export default function Home() {
  return <AnalysisView />;
}
