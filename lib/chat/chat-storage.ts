import type { ChatMessage } from "./types";

/**
 * Local persistence for the chat conversation so it survives a refresh.
 * Text-only (no blobs), so localStorage is sufficient. Cleared on sign-out.
 */

const KEY = "agron.chat";

export interface PersistedChat {
  messages: ChatMessage[];
  basket: string[];
}

export function loadChat(): PersistedChat | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Array.isArray(data?.messages) && Array.isArray(data?.basket)) return data as PersistedChat;
    return null;
  } catch {
    return null;
  }
}

export function saveChat(data: PersistedChat): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Best-effort — ignore quota/serialization failures.
  }
}

export function clearChat(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
