"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChartAnalyzer, ChartItem, MemorySaver } from "./types";
import { createChartAnalyzer } from "./analyzer";
import { createMemorySaver } from "./memory-saver";
import { loadQueue, saveQueue } from "./queue-storage";

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
  /** Update the user's notes for an item (marks it unsaved). */
  setNotes: (id: string, notes: string) => void;
  /** Persist one analyzed item to S3. */
  save: (id: string) => Promise<void>;
  /** Persist every analyzed, not-yet-saved item. */
  saveAll: () => Promise<void>;
}

/**
 * Owns the chart queue: analyzes each item independently, holds its notes, and
 * persists it (image + analysis incl. notes) on demand.
 *
 * Analysis runs sequentially through the injected analyzer; saving goes through
 * the injected saver. The item is the single source of truth for its Memory.
 */
export function useChartQueue(analyzer?: ChartAnalyzer, saver?: MemorySaver): ChartQueue {
  const fallback = useMemo(() => createChartAnalyzer(), []);
  const analyzerRef = useRef<ChartAnalyzer>(analyzer ?? fallback);
  useEffect(() => {
    analyzerRef.current = analyzer ?? fallback;
  }, [analyzer, fallback]);

  const fallbackSaver = useMemo(() => createMemorySaver(), []);
  const saverRef = useRef<MemorySaver>(saver ?? fallbackSaver);
  useEffect(() => {
    saverRef.current = saver ?? fallbackSaver;
  }, [saver, fallbackSaver]);

  const [items, setItems] = useState<ChartItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Live snapshot for the async queue runner and cleanup (kept current via effect).
  const itemsRef = useRef<ChartItem[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const processingRef = useRef(false);
  const hydratedRef = useRef(false);

  // Rehydrate the queue from IndexedDB once, on mount. Interrupted work
  // (analyzing/saving) is reset so it resumes cleanly.
  useEffect(() => {
    let cancelled = false;
    void loadQueue().then((stored) => {
      if (cancelled || stored.length === 0) {
        hydratedRef.current = true;
        return;
      }
      const restored: ChartItem[] = stored.map((s) => ({
        ...s,
        previewUrl: URL.createObjectURL(s.file),
        status: s.status === "analyzing" ? "queued" : s.status,
        saveStatus: s.saveStatus === "saving" ? "unsaved" : s.saveStatus,
      }));
      setItems(restored);
      setSelectedId((prev) => prev ?? restored[0]?.id ?? null);
      hydratedRef.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist the queue (debounced) after hydration, whenever it changes.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const timer = setTimeout(() => {
      void saveQueue(
        items.map(({ id, file, status, analysis, notes, saveStatus }) => ({
          id,
          file,
          status,
          analysis,
          notes,
          saveStatus,
        })),
      );
    }, 400);
    return () => clearTimeout(timer);
  }, [items]);

  const update = useCallback((id: string, patch: Partial<ChartItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      // Loop until no queued items remain (new ones may arrive mid-run).
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
      notes: "",
      saveStatus: "unsaved",
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

  // Editing notes invalidates a prior save.
  const setNotes = useCallback(
    (id: string, notes: string) => {
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? { ...it, notes, saveStatus: it.saveStatus === "saved" ? "unsaved" : it.saveStatus }
            : it,
        ),
      );
    },
    [],
  );

  const save = useCallback(
    async (id: string) => {
      const item = itemsRef.current.find((it) => it.id === id);
      if (!item || item.status !== "analyzed" || !item.analysis) return;
      if (item.saveStatus === "saving") return;

      update(id, { saveStatus: "saving", saveError: undefined });
      try {
        await saverRef.current.save({
          id: item.id,
          file: item.file,
          analysis: item.analysis,
          notes: item.notes,
        });
        update(id, { saveStatus: "saved" });
      } catch (err) {
        update(id, {
          saveStatus: "failed",
          saveError: err instanceof Error ? err.message : "Save failed",
        });
      }
    },
    [update],
  );

  const saveAll = useCallback(async () => {
    const ids = itemsRef.current
      .filter((it) => it.status === "analyzed" && it.saveStatus !== "saved" && it.saveStatus !== "saving")
      .map((it) => it.id);
    for (const id of ids) {
      await save(id);
    }
  }, [save]);

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

  return { items, selectedId, selected, addFiles, select, remove, setNotes, save, saveAll };
}
