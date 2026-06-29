/**
 * Upload abstraction.
 *
 * The UI depends only on these types — never on how bytes actually move. The
 * current implementation (`createLocalUploader`) keeps everything in the
 * browser and uses object URLs for preview. A future S3 uploader simply
 * implements the same `Uploader` interface and is passed in its place; no UI
 * component needs to change.
 */

export type UploadStatus = "waiting" | "uploading" | "uploaded" | "failed";

/** One image in the upload queue. */
export interface UploadItem {
  /** Stable client-side id. */
  id: string;
  file: File;
  /** Object URL for preview ONLY — not a durable/remote location. */
  previewUrl: string;
  status: UploadStatus;
  /** 0..1 upload progress. */
  progress: number;
  /**
   * Reference returned by the uploader once complete (e.g. an S3 key/URL
   * later). `null` until the upload finishes.
   */
  remoteRef: string | null;
  /** Populated when `status === "failed"`. */
  error?: string;
}

/** Result of a successful upload. */
export interface UploadResult {
  /** Durable reference to the stored object (e.g. S3 key). */
  ref: string;
  /** Optional directly-accessible URL, if the backend returns one. */
  url?: string;
}

export interface UploadOptions {
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

/**
 * Moves a single file to storage. Implementations report progress through
 * `onProgress` and resolve with a durable reference. Must reject with an
 * `AbortError` if `signal` aborts.
 */
export interface Uploader {
  upload(file: File, options?: UploadOptions): Promise<UploadResult>;
}
