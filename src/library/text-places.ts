// The page of each work that the reader read last, in this browser only, so the page of the work can offer
// "Continue". One entry for each work; the newest page wins.
export const TEXT_PLACES_KEY = "hub:text-places";
const CHANGE_EVENT = "textplacechange";

export type TextPlace = { key: string; title: string; label: string | null; at: number };

const SLUG = /^[a-z0-9-]{1,40}$/;
const KEY = /^[a-z0-9-]{1,40}$/;

function valid(value: unknown): value is TextPlace {
  if (typeof value !== "object" || value === null) return false;
  const { key, title, label, at } = value as Record<string, unknown>;
  return (
    typeof key === "string" &&
    KEY.test(key) &&
    typeof title === "string" &&
    title.length > 0 &&
    title.length <= 120 &&
    (label === null || (typeof label === "string" && label.length <= 120)) &&
    typeof at === "number"
  );
}

function readAll(): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(TEXT_PLACES_KEY) ?? "null");
    return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function saveTextPlace(slug: string, place: Omit<TextPlace, "at">) {
  if (!SLUG.test(slug)) return;
  try {
    window.localStorage.setItem(TEXT_PLACES_KEY, JSON.stringify({ ...readAll(), [slug]: { ...place, at: Date.now() } }));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // A browser with no storage: the page of the work offers "Start reading" only.
  }
}

// A store for React: the value object stays the same while the stored text does.
const cache = new Map<string, { raw: string | null; place: TextPlace | null }>();

export function readTextPlace(slug: string): TextPlace | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(TEXT_PLACES_KEY);
  } catch {
    return null;
  }
  const kept = cache.get(slug);
  if (kept && kept.raw === raw) return kept.place;
  const value = readAll()[slug];
  const place = valid(value) ? { key: value.key, title: value.title, label: value.label, at: value.at } : null;
  cache.set(slug, { raw, place });
  return place;
}

export function subscribeToTextPlaces(listener: () => void): () => void {
  window.addEventListener("storage", listener);
  window.addEventListener(CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(CHANGE_EVENT, listener);
  };
}

/** Runs before the first paint of the page of a work: it keeps the room of "Continue" when the work has a place. */
export function textPlaceScript(slug: string): string {
  return `try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(TEXT_PLACES_KEY)})||"null");if(p&&p[${JSON.stringify(slug)}])document.documentElement.dataset.textPlace=""}catch(e){}`;
}
