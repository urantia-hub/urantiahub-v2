import { paperById } from "@/content/paper-index";

// The last paper and section that the reader had in view. It stays in this browser. There is no account.
export type LastRead = { paperId: string; sectionId: string; label: string | null };

export const LAST_READ_KEY = "hub:last-read";
const CHANGE_EVENT = "lastreadchange";

let cachedRaw: string | null = null;
let cached: LastRead | null = null;

function parse(raw: string | null): LastRead | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const { paperId, sectionId, label } = value as Record<string, unknown>;
    if (typeof paperId !== "string" || !paperById(paperId)) return null;
    if (typeof sectionId !== "string" || !/^\d{1,3}$/.test(sectionId)) return null;
    if (label !== null && (typeof label !== "string" || label.length > 120)) return null;
    return { paperId, sectionId, label };
  } catch {
    return null;
  }
}

// Returns the same object for the same stored value, so that React can use it as a snapshot.
export function readLastRead(): LastRead | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(LAST_READ_KEY);
  } catch {
    return null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parse(raw);
  }
  return cached;
}

export function saveLastRead(place: LastRead): void {
  try {
    window.localStorage.setItem(LAST_READ_KEY, JSON.stringify(place));
  } catch {
    // Storage is blocked. The reader loses only the "Continue" card.
    return;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeToLastRead(listener: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
