// What this device read on the pages of the world texts, for one reader. A page can take more than one
// visit, so its passages stay here until the page is finished; then only the page goes to the account.

import { enough } from "./day-log";

export const TEXT_LOG_KEY = "hub:text-log";
const MAX_PAGES = 50;
const MAX_REFS = 3000;

type Log = { reader: string; pages: Record<string, string[]>; done: string[] };

const pageId = (work: string, page: string) => `${work}/${page}`;
const without = (pages: Log["pages"], id: string) => Object.entries(pages).filter(([key]) => key !== id);

function load(reader: string): Log {
  const empty: Log = { reader, pages: {}, done: [] };
  try {
    const stored = JSON.parse(window.localStorage.getItem(TEXT_LOG_KEY) ?? "null") as Partial<Log> | null;
    if (!stored || stored.reader !== reader || typeof stored.pages !== "object" || stored.pages === null) return empty;
    const list = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);
    const pages = Object.fromEntries(Object.entries(stored.pages).map(([id, refs]) => [id, list(refs)]));
    return { reader, pages, done: list(stored.done) };
  } catch {
    return empty;
  }
}

function save(log: Log): void {
  try {
    window.localStorage.setItem(TEXT_LOG_KEY, JSON.stringify(log));
  } catch {
    // Storage is full or blocked. The page is then not counted on this device.
  }
}

// The passages that the reader read on a page. It answers true when the page is finished now and was not
// sent before. The newest pages stay when the log is full.
export function noteTextRead(reader: string, work: string, page: string, refs: readonly string[], all: readonly string[]): boolean {
  const log = load(reader);
  const id = pageId(work, page);
  if (log.done.includes(id)) return false;
  const read = new Set(log.pages[id] ?? []);
  for (const ref of refs) if (read.size < MAX_REFS) read.add(ref);
  const kept = without(log.pages, id).slice(-(MAX_PAGES - 1));
  save({ ...log, pages: Object.fromEntries([...kept, [id, [...read]]]) });
  return enough(all.filter((ref) => read.has(ref)).length, all.length);
}

// The account took the page: its passages go, and its name stays so it is not sent again.
export function textPageSent(reader: string, work: string, page: string): void {
  const log = load(reader);
  const id = pageId(work, page);
  save({ ...log, pages: Object.fromEntries(without(log.pages, id)), done: [...log.done.filter((done) => done !== id), id].slice(-MAX_REFS) });
}

export function clearTextLog(): void {
  try {
    window.localStorage.removeItem(TEXT_LOG_KEY);
  } catch {
    // Storage is blocked: nothing is kept.
  }
}
