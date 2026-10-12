import { assetsOfPage, assetsOfStyle, inTurns, pagesToKeep } from "./offline-plan";

// "Read offline": the text of each paper, the contents, and the home page, on this device. It is a choice
// of the device, with or without an account. This page puts the pages in a cache, and the service worker
// (public/sw.js) answers from it when the network does not. The names here match the names there.
export const OFFLINE_KEY = "offline";
const CACHE = "offline-v1";
// A note in the cache: which build the copy is of, and if it is whole.
const NOTE = "/__offline/note";
const BUILD = process.env.NEXT_PUBLIC_BUILD || "dev";

export type OfflineState = {
  // "off": nothing is kept. "loading": the download runs, or waits for a connection. "on": all is kept.
  mode: "off" | "loading" | "on";
  have: number;
  total: number;
  // False when this browser cannot keep pages: the row does not show.
  can: boolean;
};

const START: OfflineState = { mode: "off", have: 0, total: 197, can: false };
let state = START;
let running = false;
let started = false;
const listeners = new Set<() => void>();

function set(next: Partial<OfflineState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

export const offlineState = () => state;
export const serverOfflineState = () => START;
export function subscribeToOffline(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

const supported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "caches" in window;

function chosen(): boolean {
  try {
    return window.localStorage.getItem(OFFLINE_KEY) === "on";
  } catch {
    return false;
  }
}

function choose(on: boolean) {
  try {
    if (on) window.localStorage.setItem(OFFLINE_KEY, "on");
    else window.localStorage.removeItem(OFFLINE_KEY);
  } catch {
    // The browser keeps nothing. The download still runs for this visit.
  }
}

async function paperPaths(): Promise<string[]> {
  const { PAPERS, paperPath } = await import("@/content/paper-index");
  return PAPERS.map((paper) => paperPath(paper.id));
}

// The worker looks at the cache again: it answers from it from now on, or no more.
async function tellWorker() {
  const registration = await navigator.serviceWorker.getRegistration();
  // A new worker can be on its way in. Each one gets the word.
  for (const worker of [registration?.installing, registration?.waiting, registration?.active]) worker?.postMessage({ type: "offline" });
}

async function readNote(cache: Cache): Promise<{ build: string; whole: boolean } | null> {
  try {
    const note = await cache.match(NOTE);
    return note ? ((await note.json()) as { build: string; whole: boolean }) : null;
  } catch {
    return null;
  }
}

const writeNote = (cache: Cache, whole: boolean) => cache.put(NOTE, new Response(JSON.stringify({ build: BUILD, whole }), { headers: { "content-type": "application/json" } }));

// The parts of the reader that load at their first use. They load now, so the worker keeps them.
const laterParts = () =>
  Promise.all([import("@/components/reader/ShareSheet"), import("@/components/reader/ImageSheet"), import("@/components/reader/NoteSheet"), import("@/components/reader/ParallelsSheet")]).catch(() => undefined);

// A page or a file of this site, as it is now. A redirect or an error is not kept.
async function take(path: string): Promise<Response> {
  const response = await fetch(path, { credentials: "same-origin" });
  if (!response.ok || response.redirected) throw new Error(`${path}: ${response.status}`);
  return response;
}

async function download() {
  if (running) return;
  running = true;
  try {
    const cache = await caches.open(CACHE);
    const papers = await paperPaths();
    const note = await readNote(cache);
    const fresh = note?.build === BUILD;
    const before = new Set((await cache.keys()).map((request) => new URL(request.url).pathname));
    // A whole copy of an older build is replaced page by page. Until the end it still answers, and the
    // reader sees no download.
    const renewing = !fresh && note?.whole === true;
    const kept = new Set(fresh ? before : []);
    const count = () => papers.filter((path) => kept.has(path)).length;
    set({ mode: renewing ? "on" : "loading", total: papers.length, have: renewing ? papers.length : count() });
    if (!renewing) await writeNote(cache, false);
    await tellWorker();

    const files = new Set<string>();
    const have = new Set<string>();
    const keepPages = (paths: string[]) =>
      inTurns(paths.filter((path) => !kept.has(path)), 4, async (path) => {
        const response = await take(path);
        for (const file of assetsOfPage(await response.clone().text())) files.add(file);
        await cache.put(path, response);
        kept.add(path);
        if (!renewing) set({ have: count() });
      });
    // The files that the pages name, and each file that a style sheet names. A file of the copy stays.
    const keepFiles = async () => {
      for (let round = 0; round < 3; round += 1) {
        const todo = [...files].filter((file) => !have.has(file));
        if (todo.length === 0) return true;
        const done = await inTurns(todo, 4, async (file) => {
          const response = (await cache.match(file)) ?? (await take(file));
          if (file.endsWith(".css")) for (const inner of assetsOfStyle(await response.clone().text(), file)) files.add(inner);
          if (!before.has(file)) await cache.put(file, response);
          have.add(file);
        });
        if (!done) return false;
      }
      return true;
    };
    // The files come before the papers. So a download that stops in the middle leaves pages that work.
    const [home, contents, ...rest] = pagesToKeep(papers);
    let ok = await keepPages([home, contents, rest[0]]);
    if (ok && files.size === 0) for (const file of assetsOfPage(await (await take(contents)).text())) files.add(file);
    if (ok) {
      await laterParts();
      for (const entry of performance.getEntriesByType("resource")) {
        const url = new URL(entry.name);
        if (url.origin === window.location.origin && url.pathname.startsWith("/_next/static/")) files.add(url.pathname);
      }
      ok = await keepFiles();
    }
    if (ok) ok = (await keepPages(rest)) && (await keepFiles());
    if (!ok) return;
    // The files of an older build go. Each page now names the files of this one.
    if (!fresh) for (const path of before) if (path.startsWith("/_next/static/") && !files.has(path)) await cache.delete(path);
    await writeNote(cache, true);
    set({ mode: "on", have: papers.length });
  } catch {
    // No connection, or no room. The count stays, and the download goes on at the next chance.
  } finally {
    running = false;
  }
}

/** The reader turned "Read offline" on. */
export async function startOffline() {
  if (!supported()) return;
  choose(true);
  set({ mode: "loading" });
  try {
    await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
  } catch {
    // The download still runs. The worker starts at a later visit.
  }
  await download();
}

/** The reader turned it off: the pages leave this device. */
export async function removeOffline() {
  choose(false);
  set({ mode: "off", have: 0 });
  try {
    await caches.delete(CACHE);
    await tellWorker();
  } catch {
    // The browser removes the cache with the data of the site.
  }
}

/** At each page load: what this device keeps, and the rest of a download that did not finish. */
export async function initOffline() {
  if (started) return;
  started = true;
  if (!supported()) return;
  set({ can: true });
  if (!chosen()) return;
  try {
    const cache = await caches.open(CACHE);
    const papers = await paperPaths();
    const have = new Set((await cache.keys()).map((request) => new URL(request.url).pathname));
    const note = await readNote(cache);
    const count = papers.filter((path) => have.has(path)).length;
    const whole = note?.whole === true && count === papers.length;
    set({ mode: whole ? "on" : "loading", have: count, total: papers.length });
    void tellWorker();
    // A site that changed gets a new copy, with no press.
    const go = () => void (navigator.onLine && (state.mode === "loading" || note?.build !== BUILD) && download());
    window.addEventListener("online", go);
    if (!whole || note?.build !== BUILD) go();
  } catch {
    set({ mode: "off" });
  }
}

export function resetOfflineForTest() {
  state = START;
  running = false;
  started = false;
  listeners.clear();
}
