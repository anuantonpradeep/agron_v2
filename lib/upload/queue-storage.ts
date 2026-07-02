import type { ChartItem } from "./types";

/**
 * Local persistence for the chart queue so the session survives a refresh.
 *
 * Uses IndexedDB because it can store the image `File` blobs (localStorage
 * can't). The whole queue is stored as one record to preserve order. Preview
 * object URLs are NOT stored — they're recreated on load.
 */

const DB_NAME = "agron";
const STORE = "queue";
const KEY = "current";
const VERSION = 1;

/** What we persist per item — everything except the transient preview URL/errors. */
export type StoredChartItem = Pick<
  ChartItem,
  "id" | "file" | "status" | "analysis" | "notes" | "saveStatus"
>;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadQueue(): Promise<StoredChartItem[]> {
  if (typeof indexedDB === "undefined") return [];
  try {
    const db = await openDb();
    const items = await new Promise<StoredChartItem[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result?.items as StoredChartItem[]) ?? []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return items;
  } catch {
    return [];
  }
}

export async function saveQueue(items: StoredChartItem[]): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ id: KEY, items });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Best-effort — persistence failures shouldn't break the app.
  }
}

export async function clearQueue(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore
  }
}
