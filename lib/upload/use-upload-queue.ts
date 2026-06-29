"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Uploader, UploadItem } from "./types";
import { createLocalUploader } from "./local-uploader";

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface UploadQueue {
  items: UploadItem[];
  selectedId: string | null;
  selected: UploadItem | null;
  /** Add one or more images to the queue (non-images are ignored). */
  addFiles: (files: File[] | FileList) => void;
  /** Make an item the active preview. */
  select: (id: string) => void;
  /** Remove an item and revoke its preview URL. */
  remove: (id: string) => void;
}

/**
 * Owns upload-queue state and drives uploads through the injected `Uploader`.
 *
 * Files are processed sequentially (one "uploading" at a time) so the queue's
 * waiting / uploading / uploaded states are meaningful. The hook is agnostic to
 * the uploader implementation — pass an S3 uploader later and nothing here or
 * in the UI changes.
 */
export function useUploadQueue(uploader?: Uploader): UploadQueue {
  // Default to the local (browser-only) uploader; stable across renders.
  const fallback = useMemo(() => createLocalUploader(), []);
  const uploaderRef = useRef<Uploader>(uploader ?? fallback);
  uploaderRef.current = uploader ?? fallback;

  const [items, setItems] = useState<UploadItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Keep a live snapshot for the async queue runner and cleanup.
  const itemsRef = useRef<UploadItem[]>([]);
  itemsRef.current = items;
  const processingRef = useRef(false);

  const update = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      // Loop until no waiting items remain (new ones may arrive mid-run).
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const next = itemsRef.current.find((it) => it.status === "waiting");
        if (!next) break;

        update(next.id, { status: "uploading", progress: 0 });
        try {
          const result = await uploaderRef.current.upload(next.file, {
            onProgress: (p) => update(next.id, { progress: p }),
          });
          update(next.id, { status: "uploaded", progress: 1, remoteRef: result.ref });
        } catch (err) {
          update(next.id, {
            status: "failed",
            error: err instanceof Error ? err.message : "Upload failed",
          });
        }
      }
    } finally {
      processingRef.current = false;
    }
  }, [update]);

  // Kick the runner whenever something is waiting.
  useEffect(() => {
    if (!processingRef.current && items.some((it) => it.status === "waiting")) {
      void processQueue();
    }
  }, [items, processQueue]);

  const addFiles = useCallback((files: File[] | FileList) => {
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;

    const created: UploadItem[] = images.map((file) => ({
      id: makeId(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: "waiting",
      progress: 0,
      remoteRef: null,
    }));

    setItems((prev) => [...prev, ...created]);
    setSelectedId((prev) => prev ?? created[0].id);
  }, []);

  const select = useCallback((id: string) => setSelectedId(id), []);

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((it) => it.id !== id);
    });
    setSelectedId((prev) => {
      if (prev !== id) return prev;
      const remaining = itemsRef.current.filter((it) => it.id !== id);
      return remaining[0]?.id ?? null;
    });
  }, []);

  // Revoke every created object URL on unmount.
  useEffect(() => {
    return () => {
      itemsRef.current.forEach((it) => URL.revokeObjectURL(it.previewUrl));
    };
  }, []);

  const selected = useMemo(
    () => items.find((it) => it.id === selectedId) ?? null,
    [items, selectedId],
  );

  return { items, selectedId, selected, addFiles, select, remove };
}
