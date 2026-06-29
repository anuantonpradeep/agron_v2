# Agron V2 — Chart Analysis UI

The chart-analysis ("Memory") screen for Agron, built to the approved design.
A user uploads a trading-chart screenshot; the image displays immediately and
every analysis section is ready to be populated by the backend.

Stack: **Next.js 16.2.9 · React 19 · Tailwind CSS v4 · TypeScript**.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint     # eslint
```

## Layout

A two-column screen with eight numbered sections, matching the design:

| Left column            | Right column                  |
| ---------------------- | ----------------------------- |
| 1. Original Chart      | 4. Observations               |
| 2. Metadata            | 5. Interpretation             |
| 3. Market Context      | 6. Evidence                   |
|                        | 7. Trade Ideas (Educational)  |
|                        | 8. Tags / Concepts            |

## State model

The UI is built around **real data only** — it never fabricates analysis.

- **First load (idle):** no chart uploaded. Section 1 shows the upload dropzone
  as the primary call to action; sections 2–8 show empty states that explicitly
  prompt the user to upload a chart.
- **After selecting an image (analyzing):** section 1 shows the **image
  immediately** with an "Analyzing chart…" pipeline indicator; sections 2–8
  switch to **loading skeletons**. No observations, interpretation, evidence,
  metadata or concepts are populated until the backend returns them.
- **Complete:** when `analysis` is supplied with `status: "complete"`, each
  section renders its real data.

## Components

All components are prop-driven (`components/analysis/`, primitives in
`components/ui/`). The full payload shape is `ChartAnalysis` in
`lib/analysis-types.ts` — every field is optional so any section can
independently be empty / loading / populated.

```tsx
import { AnalysisView } from "@/components/analysis/analysis-view";

<AnalysisView
  analysis={chartAnalysis}   // ChartAnalysis | undefined
  status="complete"          // "idle" | "analyzing" | "complete" | "failed"
  uploader={s3Uploader}      // optional; defaults to the browser-only uploader
/>
```

## Image upload (Milestone 1)

Real, browser-only upload. **S3 is intentionally not integrated yet.**

- Select **or drag** one or more images. Non-images are ignored.
- The selected image previews immediately in the Original Chart panel; the
  queue lists every image with a thumbnail and status.
- Each item moves through **Waiting → Uploading → Uploaded** (with progress).
  Items are processed sequentially so one uploads at a time.
- Object URLs are used for **preview only** and are revoked on remove / unmount.

### Swapping in S3 later — no UI changes

The UI depends only on the `Uploader` interface and `UploadItem` shape in
`lib/upload/types.ts`. The default implementation is
`createLocalUploader()` (`lib/upload/local-uploader.ts`), which simulates the
upload lifecycle in the browser. To use S3:

1. Implement `Uploader.upload(file, { onProgress, signal })` to PUT to S3 (e.g.
   via a presigned URL) and resolve with `{ ref: <s3-key>, url? }`.
2. Pass it as `<AnalysisView uploader={s3Uploader} />`.

`useUploadQueue` (`lib/upload/use-upload-queue.ts`) and `OriginalChart` are
unchanged by that swap — the queue, statuses, and preview are uploader-agnostic.

### Wiring up the backend (later milestone)

Analysis is still prop-driven. Hold `analysis`/`status` in a client parent and
pass them down once the backend returns results. Until then, a fully-uploaded
chart stays in the analyzing state (loading skeletons) — by design, since the UI
never invents analysis.
