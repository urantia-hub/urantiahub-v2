// The paragraphs that the signed-in reader saved in the open paper, and the reader's notes on it.
// Nothing of this goes into the browser's storage: it lives for the life of the page, for one reader.

import { accountKey, markSignedOut, subscribeToAccount } from "./client";
import type { PaperSaved, SavedNote } from "./saved-data";
import { readerChanged } from "./sync";

export type Saved = {
  // "none": nothing asked. "failed": the load had no answer; a save still works.
  status: "none" | "loading" | "ready" | "failed";
  paperId: string | null;
  bookmarks: ReadonlySet<string>;
  notes: readonly SavedNote[];
};

const NONE: Saved = { status: "none", paperId: null, bookmarks: new Set(), notes: [] };
let state: Saved = NONE;
// The reader whose data this is. Each change of reader starts a new life, and an answer for the life
// before is dropped.
let owner: string | null = null;
let life = 0;
// What the account holds for a paragraph, as far as this page knows.
const held = new Map<string, boolean>();
const chains = new Map<string, Promise<boolean>>();
const listeners = new Set<() => void>();

function set(next: Saved) {
  state = next;
  for (const listener of listeners) listener();
}

export const savedState = (): Saved => state;
export const noSaved = (): Saved => NONE;

export function subscribeToSaved(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function clear() {
  life += 1;
  owner = null;
  held.clear();
  chains.clear();
  if (state !== NONE) set(NONE);
}

let watching = false;
function watch() {
  if (watching) return;
  watching = true;
  // A sign-out, or another reader: nothing of the reader before stays on the page.
  subscribeToAccount(() => {
    if (owner !== null && accountKey() !== owner) clear();
  });
}

// One request for the reader of this page. Null when it had no usable answer.
async function ask(key: string, path: string, init: RequestInit = {}): Promise<unknown> {
  const at = life;
  try {
    const response = await fetch(path, { ...init, headers: { accept: "application/json", "content-type": "application/json", "x-hub-reader": key } });
    if (life !== at) return null;
    if (response.status === 401) markSignedOut();
    else if (response.status === 409) void readerChanged();
    if (!response.ok) return null;
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function own(key: string) {
  watch();
  if (owner !== key) {
    clear();
    owner = key;
  }
}

export async function loadSaved(paperId: string): Promise<void> {
  const key = accountKey();
  if (!key) return;
  own(key);
  const at = life;
  set({ ...NONE, status: "loading", paperId, bookmarks: state.paperId === paperId ? state.bookmarks : NONE.bookmarks });
  const body = (await ask(key, `/api/me/saved?paper=${encodeURIComponent(paperId)}`)) as Partial<PaperSaved> | null;
  if (life !== at || state.paperId !== paperId) return;
  if (!body || !Array.isArray(body.bookmarks) || !Array.isArray(body.notes)) return set({ ...state, status: "failed" });
  // A press on Save during the load is newer than the answer.
  const bookmarks = new Set(body.bookmarks);
  for (const ref of body.bookmarks) if (!chains.has(ref)) held.set(ref, true);
  for (const ref of chains.keys()) if (state.bookmarks.has(ref)) bookmarks.add(ref);
  else bookmarks.delete(ref);
  set({ status: "ready", paperId, bookmarks, notes: body.notes });
}

function show(ref: string, on: boolean) {
  const bookmarks = new Set(state.bookmarks);
  if (on) bookmarks.add(ref);
  else bookmarks.delete(ref);
  set({ ...state, bookmarks });
}

// Saves the paragraph, or removes it. The page changes at once. False when the account did not take
// the change: the page then shows what the account holds.
export function toggleBookmark(ref: string): Promise<boolean> {
  const key = accountKey();
  if (!key) return Promise.resolve(false);
  own(key);
  const at = life;
  const want = !state.bookmarks.has(ref);
  show(ref, want);
  // Two fast presses go to the account in their order.
  const run: Promise<boolean> = (chains.get(ref) ?? Promise.resolve(true)).then(async () => {
    if (life !== at) return false;
    const body = (await (want
      ? ask(key, "/api/me/bookmarks", { method: "POST", body: JSON.stringify({ ref }) })
      : ask(key, `/api/me/bookmarks?ref=${encodeURIComponent(ref)}`, { method: "DELETE" }))) as { ok?: unknown } | null;
    if (life !== at) return false;
    const ok = body?.ok === true;
    if (ok) held.set(ref, want);
    if (chains.get(ref) === run) {
      chains.delete(ref);
      if (!ok) show(ref, held.get(ref) ?? !want);
    }
    return ok;
  });
  chains.set(ref, run);
  return run;
}

export function resetSavedForTest(): void {
  clear();
}
