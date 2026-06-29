"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChartAnalyzer, ChartItem } from "./types";
import { createChartAnalyzer } from "./analyzer";

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface ChartQueue {
  items: ChartItem[];
  selectedId: string | null;
  selected: ChartItem | null;
  /** Add one or more images to the queue (non-images are ignored). */
  addFiles: (files: File[] | FileList) => void;
  /** Make an item the active preview. */
  select: (id: string) => void;
  /** Remove an item and revoke its preview URL. */
  remove: (id: string) => void;
}

/**
 * Owns the chart queue and analyzes each item independently.
 *
 * Items are processed sequentially (one "analyzing" at a time) through the
 * injected analyzer; the result is stored on the item. No persistence — results
 * live only in React state and vanish on refresh.
 */
export function useChartQueue(analyzer?: ChartAnalyzer): ChartQueue {
  const fallback = useMemo(() => createChartAnalyzer(), []);
  const analyzerRef = useRef<ChartAnalyzer>(analyzer ?? fallback);
  analyzerRef.current = analyzer ?? fallback;

  const [items, setItems] = useState<ChartItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const itemsRef = useRef<ChartItem[]>([]);
  itemsRef.current = items;
  const processingRef = useRef(false);

  const update = useCallback((id: string, patch: Partial<ChartItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      // Loop until no queued items remain (new ones may arrive mid-run).
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const next = itemsRef.current.find((it) => it.status === "queued");
        if (!next) break;

        update(next.id, { status: "analyzing" });
        try {
          const analysis = await analyzerRef.current.analyze(next.file);
          update(next.id, { status: "analyzed", analysis });
        } catch (err) {
          update(next.id, {
            status: "failed",
            error: err instanceof Error ? err.message : "Analysis failed",
          });
        }
      }
    } finally {
      processingRef.current = false;
    }
  }, [update]);

  // Kick the runner whenever something is queued.
  useEffect(() => {
    if (!processingRef.current && items.some((it) => it.status === "queued")) {
      void processQueue();
    }
  }, [items, processQueue]);

  const addFiles = useCallback((files: File[] | FileList) => {
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;

    const created: ChartItem[] = images.map((file) => ({
      id: makeId(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: "queued",
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
