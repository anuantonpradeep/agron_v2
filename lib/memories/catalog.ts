import type { ChartAnalysis } from "@/lib/analysis-types";
import { getObjectJson, putObject, listKeys } from "@/lib/aws/s3";

/**
 * Per-user catalog of saved memories — a compact summary of every memory.json
 * so chat can search the archive without loading every full record. Stored at
 * users/{userId}/catalog.json and kept in sync on Save (or rebuilt on demand).
 */

/** One line in the catalog. */
export interface CatalogEntry {
  id: string;
  symbol: string;
  timeframe: string;
  savedAt: string;
  bias: string;
  phase: string;
  concepts: string[];
  summary: string;
  notes: string;
}

/** Shape of a stored memory.json (analysis carries notes nested in). */
export interface StoredMemory {
  id: string;
  savedAt?: string;
  analysis?: ChartAnalysis & { notes?: string };
}

function catalogKey(userId: string): string {
  return `users/${userId}/catalog.json`;
}

function truncate(text: string | undefined, max: number): string {
  const t = (text ?? "").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

/** Derive a compact catalog entry from a stored memory. */
export function toCatalogEntry(memory: StoredMemory): CatalogEntry {
  const a = memory.analysis;
  return {
    id: memory.id,
    symbol: a?.metadata?.symbol ?? "Unknown",
    timeframe: a?.metadata?.timeframe ?? "",
    savedAt: memory.savedAt ?? "",
    bias: a?.marketContext?.overallBias ?? "",
    phase: a?.marketContext?.phase ?? "",
    concepts: (a?.concepts ?? []).map((c) => c.label).slice(0, 12),
    summary: truncate(a?.interpretation?.paragraphs?.[0], 240),
    notes: truncate(a?.notes, 240),
  };
}

export async function loadCatalog(userId: string): Promise<CatalogEntry[]> {
  const data = await getObjectJson<CatalogEntry[]>(catalogKey(userId));
  return Array.isArray(data) ? data : [];
}

async function saveCatalog(userId: string, entries: CatalogEntry[]): Promise<void> {
  await putObject({
    key: catalogKey(userId),
    body: JSON.stringify(entries, null, 2),
    contentType: "application/json",
  });
}

/** Insert or replace one entry (called after a Save). Best-effort. */
export async function upsertCatalogEntry(userId: string, entry: CatalogEntry): Promise<void> {
  const entries = await loadCatalog(userId);
  const next = entries.filter((e) => e.id !== entry.id);
  next.unshift(entry);
  await saveCatalog(userId, next);
}

/** Rebuild the whole catalog by scanning the user's saved memory.json files. */
export async function rebuildCatalog(userId: string): Promise<number> {
  const keys = (await listKeys(`users/${userId}/memories/`)).filter((k) => k.endsWith("/memory.json"));
  const entries: CatalogEntry[] = [];
  for (const key of keys) {
    const memory = await getObjectJson<StoredMemory>(key);
    if (memory?.id) entries.push(toCatalogEntry(memory));
  }
  entries.sort((a, b) => (b.savedAt ?? "").localeCompare(a.savedAt ?? ""));
  await saveCatalog(userId, entries);
  return entries.length;
}
