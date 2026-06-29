import type { Uploader, UploadOptions, UploadResult } from "./types";

/**
 * Browser-only uploader used until S3 is wired up.
 *
 * It does not send bytes anywhere — it simulates an upload lifecycle so the
 * queue can move through waiting → uploading → uploaded with real progress.
 * The returned `ref` is a local placeholder; swapping in an S3 uploader that
 * returns a real key requires no UI changes.
 */
export function createLocalUploader(options?: { durationMs?: number }): Uploader {
  const duration = Math.max(200, options?.durationMs ?? 1400);

  return {
    upload(file: File, { onProgress, signal }: UploadOptions = {}): Promise<UploadResult> {
      return new Promise<UploadResult>((resolve, reject) => {
        if (signal?.aborted) {
          reject(new DOMException("Upload aborted", "AbortError"));
          return;
        }

        const steps = 20;
        const interval = duration / steps;
        let step = 0;

        const timer = setInterval(() => {
          step += 1;
          onProgress?.(Math.min(step / steps, 1));
          if (step >= steps) {
            cleanup();
            resolve({ ref: `local://${encodeURIComponent(file.name)}` });
          }
        }, interval);

        const onAbort = () => {
          cleanup();
          reject(new DOMException("Upload aborted", "AbortError"));
        };

        function cleanup() {
          clearInterval(timer);
          signal?.removeEventListener("abort", onAbort);
        }

        signal?.addEventListener("abort", onAbort);
      });
    },
  };
}
