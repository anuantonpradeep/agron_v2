"use client";

import { useRef, type ChangeEvent, type DragEvent } from "react";
import { SectionHeading } from "@/components/ui/primitives";
import type { UploadItem, UploadStatus } from "@/lib/upload/types";

/**
 * [1] Original Chart — the upload component.
 *
 * Presentational only: it renders the upload queue and the selected preview,
 * and reports user intent through callbacks. It has no knowledge of how uploads
 * are performed, so the underlying uploader (local now, S3 later) can change
 * without touching this component.
 */
export function OriginalChart({
  items,
  selected,
  onAddFiles,
  onSelect,
  onRemove,
  disabled,
}: {
  items: UploadItem[];
  selected: UploadItem | null;
  /** User picked or dropped one or more files. */
  onAddFiles: (files: FileList | File[]) => void;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) onAddFiles(e.target.files);
    // Reset so selecting the same file again still fires onChange.
    e.target.value = "";
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (disabled) return;
    if (e.dataTransfer.files?.length) onAddFiles(e.dataTransfer.files);
  }

  const hasItems = items.length > 0;

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading index={1} title="Original Chart" subtitle="The uploaded screenshot." />

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />

      {hasItems ? (
        <div className="flex flex-col gap-3">
          {/* Selected preview */}
          <div
            className="overflow-hidden rounded-xl border"
            style={{ background: "var(--panel)", borderColor: "var(--panel-border)" }}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {selected ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selected.previewUrl}
                  alt={`Uploaded chart: ${selected.file.name}`}
                  className="block h-auto w-full"
                />
                <div
                  className="flex items-center justify-between gap-3 border-t px-4 py-2.5"
                  style={{ borderColor: "var(--panel-border)" }}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <StatusBadge status={selected.status} progress={selected.progress} />
                    <span className="truncate text-[12px] text-[var(--muted)]">
                      {selected.file.name}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={disabled}
                    className="shrink-0 rounded-md px-2.5 py-1 text-[12px] font-medium text-[var(--violet)] transition-colors hover:bg-[var(--violet-bg)] disabled:opacity-40"
                  >
                    Add images
                  </button>
                </div>
              </>
            ) : null}
          </div>

          {/* Upload queue */}
          <UploadQueueList
            items={items}
            selectedId={selected?.id ?? null}
            onSelect={onSelect}
            onRemove={onRemove}
            disabled={disabled}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          disabled={disabled}
          className="flex aspect-[3/2] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed text-center transition-colors hover:border-[var(--violet-border)] disabled:opacity-50"
          style={{ background: "var(--panel)", borderColor: "var(--panel-border)" }}
        >
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full"
            style={{ background: "var(--violet-bg)", color: "var(--violet)" }}
          >
            <UploadIcon />
          </span>
          <span className="text-[14px] font-medium text-[var(--foreground)]">
            Upload trading charts
          </span>
          <span className="text-[12px] text-[var(--muted)]">
            Click to browse or drop one or more screenshots here
          </span>
        </button>
      )}
    </section>
  );
}

/* ─── Upload queue list ───────────────────────────────────────────────────── */

function UploadQueueList({
  items,
  selectedId,
  onSelect,
  onRemove,
  disabled,
}: {
  items: UploadItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => {
        const active = item.id === selectedId;
        return (
          <li key={item.id}>
            <div
              className="flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors"
              style={{
                background: active ? "var(--violet-bg)" : "var(--panel)",
                borderColor: active ? "var(--violet-border)" : "var(--panel-border)",
              }}
            >
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                aria-pressed={active}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.previewUrl}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-md object-cover"
                  style={{ border: "1px solid var(--panel-border)" }}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[12.5px] font-medium text-[var(--foreground)]">
                    {item.file.name}
                  </span>
                  <span className="text-[11px] text-[var(--muted)]">
                    {formatBytes(item.file.size)}
                  </span>
                </span>
              </button>

              <StatusBadge status={item.status} progress={item.progress} />

              <button
                type="button"
                onClick={() => onRemove(item.id)}
                disabled={disabled}
                aria-label={`Remove ${item.file.name}`}
                className="shrink-0 rounded-md p-1 text-[var(--muted)] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--foreground)] disabled:opacity-40"
              >
                <CloseIcon />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ─── Status badge ────────────────────────────────────────────────────────── */

function StatusBadge({ status, progress }: { status: UploadStatus; progress: number }) {
  const config = {
    waiting: { label: "Waiting", color: "var(--muted)", bg: "rgba(255,255,255,0.05)", border: "var(--panel-border)" },
    uploading: { label: `Uploading ${Math.round(progress * 100)}%`, color: "var(--info)", bg: "var(--info-bg)", border: "var(--info-border)" },
    uploaded: { label: "Uploaded", color: "var(--accent)", bg: "var(--accent-bg)", border: "var(--accent-border)" },
    failed: { label: "Failed", color: "var(--danger)", bg: "var(--danger-bg)", border: "var(--danger-border)" },
  }[status];

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium"
      style={{ color: config.color, background: config.bg, borderColor: config.border }}
    >
      {status === "uploading" ? <Spinner /> : status === "uploaded" ? <CheckIcon /> : null}
      {config.label}
    </span>
  );
}

/* ─── Icons ───────────────────────────────────────────────────────────────── */

function Spinner() {
  return (
    <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
