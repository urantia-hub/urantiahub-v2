// The paragraph where the voice stopped, in this browser only, so a reader who comes back can continue there.
const KEY = "hub:voice-place";
const KEEP = 30 * 24 * 60 * 60 * 1000;

export type VoicePlace = { paperId: string; ref: string };

export function saveVoicePlace(place: VoicePlace) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...place, at: Date.now() }));
  } catch {
    // A browser with no storage: the reader starts from the paragraph in view.
  }
}

// A store for React: the place of an earlier visit. The value object stays the same while the stored text does.
let cachedRaw: string | null = null;
let cached: (VoicePlace & { at: number }) | null = null;

export function readVoicePlace(): (VoicePlace & { at: number }) | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const value = JSON.parse(raw ?? "null") as { paperId?: unknown; ref?: unknown; at?: unknown } | null;
      cached =
        value && typeof value.paperId === "string" && typeof value.ref === "string" && typeof value.at === "number"
          ? { paperId: value.paperId, ref: value.ref, at: value.at }
          : null;
    } catch {
      cached = null;
    }
  }
  return cached && Date.now() - cached.at <= KEEP ? cached : null;
}

export function subscribeToVoicePlace(listener: () => void): () => void {
  window.addEventListener("storage", listener);
  return () => window.removeEventListener("storage", listener);
}

export function clearVoicePlace() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
