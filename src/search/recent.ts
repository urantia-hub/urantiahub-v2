// The last searches of this reader. They stay in this browser. There is no account.
export const RECENT_KEY = "hub:recent-searches";
const CHANGE_EVENT = "recentsearchchange";
const MAX_RECENT = 5;
const NONE: readonly string[] = [];

let cachedRaw: string | null = null;
let cached: readonly string[] = NONE;

function parse(raw: string | null): readonly string[] {
  if (!raw) return NONE;
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return NONE;
    const list = value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0 && entry.length <= 200);
    return list.length > 0 ? list.slice(0, MAX_RECENT) : NONE;
  } catch {
    return NONE;
  }
}

// Returns the same list object for the same stored value, so that React can use it as a snapshot.
export function readRecent(): readonly string[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(RECENT_KEY);
  } catch {
    return NONE;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parse(raw);
  }
  return cached;
}

function write(list: readonly string[]): void {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // Storage is blocked. The reader loses only the "Recent" list.
    return;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function saveRecent(q: string): void {
  const lower = q.toLowerCase();
  write([q, ...readRecent().filter((entry) => entry.toLowerCase() !== lower)].slice(0, MAX_RECENT));
}

export function clearRecent(): void {
  write([]);
}

export function subscribeToRecent(listener: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
