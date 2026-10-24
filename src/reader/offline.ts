import { assetsOfPage, assetsOfStyle, inTurns, pagesToKeep } from "./offline-plan";

// "Read offline": the text of each paper, the contents, and the home page, on this device. It is a choice
// of the device for each language, with or without an account. This page puts the pages in one cache, and
// the service worker (public/sw.js) answers from it when the network does not. The names match the names there.
type Lang = "en" | "es";
const LANGS: Lang[] = ["en", "es"];
export const OFFLINE_KEY = "offline";
const KEYS: Record<Lang, string> = { en: OFFLINE_KEY, es: "offline-es" };
const CACHE = "offline-v1";
// A note in the cache for each language: which build the copy is of, if it is whole, and the files it uses.
const NOTES: Record<Lang, string> = { en: "/__offline/note", es: "/__offline/note-es" };
type Note = { build: string; whole: boolean; files?: string[] };
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
let states: Record<Lang, OfflineState> = { en: START, es: START };
const running: Record<Lang, boolean> = { en: false, es: false };
let started = false;
const listeners = new Set<() => void>();

function set(lang: Lang, next: Partial<OfflineState>) {
  states = { ...states, [lang]: { ...states[lang], ...next } };
  listeners.forEach((listener) => listener());
}

export const offlineState = (lang: Lang = "en") => states[lang];
export const serverOfflineState = () => START;
export function subscribeToOffline(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

const supported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "caches" in window;

function chosen(lang: Lang): boolean {
  try {
    return window.localStorage.getItem(KEYS[lang]) === "on";
  } catch {
    return false;
  }
}

function choose(lang: Lang, on: boolean) {
  try {
    if (on) window.localStorage.setItem(KEYS[lang], "on");
    else window.localStorage.removeItem(KEYS[lang]);
  } catch {
    // The browser keeps nothing. The download still runs for this visit.
  }
}

async function paperPaths(lang: Lang): Promise<string[]> {
  const { PAPERS_BY_LANG, paperPath } = await import("@/content/paper-index");
  return PAPERS_BY_LANG[lang].map((paper) => paperPath(paper.id, lang));
}

// The worker looks at the cache again: it answers from it from now on, or no more.
async function tellWorker() {
  const registration = await navigator.serviceWorker.getRegistration();
  // A new worker can be on its way in. Each one gets the word.
  for (const worker of [registration?.installing, registration?.waiting, registration?.active]) worker?.postMessage({ type: "offline" });
}

async function readNote(cache: Cache, lang: Lang): Promise<Note | null> {
  try {
    const note = await cache.match(NOTES[lang]);
    return note ? ((await note.json()) as Note) : null;
  } catch {
    return null;
  }
}

const writeNote = (cache: Cache, lang: Lang, whole: boolean, files: string[] = []) =>
  cache.put(NOTES[lang], new Response(JSON.stringify({ build: BUILD, whole, files }), { headers: { "content-type": "application/json" } }));

// The parts of the reader that load at their first use. They load now, so the worker keeps them.
const laterParts = () =>
  Promise.all([import("@/components/reader/ShareSheet"), import("@/components/reader/ImageSheet"), import("@/components/reader/NoteSheet"), import("@/components/reader/ParallelsSheet")]).catch(() => undefined);

// A page or a file of this site, as it is now. A redirect or an error is not kept.
async function take(path: string): Promise<Response> {
  const response = await fetch(path, { credentials: "same-origin" });
  if (!response.ok || response.redirected) throw new Error(`${path}: ${response.status}`);
  return response;
}

async function download(lang: Lang) {
  if (running[lang]) return;
  running[lang] = true;
  try {
    const cache = await caches.open(CACHE);
    const papers = await paperPaths(lang);
    const note = await readNote(cache, lang);
    const fresh = note?.build === BUILD;
    const before = new Set((await cache.keys()).map((request) => new URL(request.url).pathname));
    // A whole copy of an older build is replaced page by page. Until the end it still answers, and the
    // reader sees no download.
    const renewing = !fresh && note?.whole === true;
    const kept = new Set(fresh ? before : []);
    const count = () => papers.filter((path) => kept.has(path)).length;
    set(lang, { mode: renewing ? "on" : "loading", total: papers.length, have: renewing ? papers.length : count() });
    if (!renewing) await writeNote(cache, lang, false);
    await tellWorker();

    const files = new Set<string>();
    const have = new Set<string>();
    const keepPages = (paths: string[]) =>
      inTurns(paths.filter((path) => !kept.has(path)), 4, async (path) => {
        const response = await take(path);
        for (const file of assetsOfPage(await response.clone().text())) files.add(file);
        await cache.put(path, response);
        kept.add(path);
        if (!renewing) set(lang, { have: count() });
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
    const pages = pagesToKeep(lang, papers);
    const lead = lang === "es" ? 2 : 3;
    const contents = pages[lead - 2];
    const rest = pages.slice(lead);
    let ok = await keepPages(pages.slice(0, lead));
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
    // The files of an older build go. Each page now names the files of this one. A file that the copy of
    // the other language names stays.
    if (!fresh) {
      const other = await readNote(cache, lang === "en" ? "es" : "en");
      const theirs = new Set(other?.files ?? []);
      for (const path of before) if (path.startsWith("/_next/static/") && !files.has(path) && !theirs.has(path)) await cache.delete(path);
    }
    await writeNote(cache, lang, true, [...files]);
    set(lang, { mode: "on", have: papers.length });
  } catch {
    // No connection, or no room. The count stays, and the download goes on at the next chance.
  } finally {
    running[lang] = false;
  }
}

/** The reader turned "Read offline" on for one language. */
export async function startOffline(lang: Lang = "en") {
  if (!supported()) return;
  choose(lang, true);
  set(lang, { mode: "loading" });
  try {
    await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
  } catch {
    // The download still runs. The worker starts at a later visit.
  }
  await download(lang);
}

/** The reader turned it off for one language: its pages leave this device. The last one takes the cache. */
export async function removeOffline(lang: Lang = "en") {
  choose(lang, false);
  set(lang, { mode: "off", have: 0 });
  try {
    if (LANGS.some((other) => other !== lang && chosen(other))) {
      const cache = await caches.open(CACHE);
      for (const path of [...pagesToKeep(lang, await paperPaths(lang)), NOTES[lang]]) await cache.delete(path);
    } else {
      await caches.delete(CACHE);
    }
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
  for (const lang of LANGS) set(lang, { can: true });
  for (const lang of LANGS.filter(chosen)) {
    try {
      const cache = await caches.open(CACHE);
      const papers = await paperPaths(lang);
      const have = new Set((await cache.keys()).map((request) => new URL(request.url).pathname));
      const note = await readNote(cache, lang);
      const count = papers.filter((path) => have.has(path)).length;
      const whole = note?.whole === true && count === papers.length;
      set(lang, { mode: whole ? "on" : "loading", have: count, total: papers.length });
      void tellWorker();
      // A site that changed gets a new copy, with no press.
      const go = () => void (navigator.onLine && (states[lang].mode === "loading" || note?.build !== BUILD) && download(lang));
      window.addEventListener("online", go);
      if (!whole || note?.build !== BUILD) go();
    } catch {
      set(lang, { mode: "off" });
    }
  }
}

export function resetOfflineForTest() {
  states = { en: START, es: START };
  running.en = false;
  running.es = false;
  started = false;
  listeners.clear();
}
