// The streak in the browser of a signed-in reader: the card from the account, the finished sections
// that wait to go there, and the one question. Nothing goes to the account before the reader's yes.

import type { StreakCard } from "@/account/streak-data";
import { accountKey, markSignedOut } from "@/account/client";
import { track } from "@/analytics";
import { clearDayLog, finished, noteHeard, noteRead } from "./day-log";
import { clearTextLog, noteTextRead, textPageSent } from "./text-log";
import { markById } from "@/marks/list";
import { readingDay, type Goal } from "./rules";

export const streaksOn = (): boolean => process.env.NEXT_PUBLIC_STREAKS === "on";

type Row = { day: string; paperId: string; sectionId: string; how: "read" | "heard" };
// `moments`: the ids of new marks that wait to play, in the order to play them. `failed`: the card did
// not load, so a page shows no shell for it.
export type StreakView = { card: StreakCard | null; asking: boolean; moments: string[]; failed: boolean };

const PENDING_KEY = "hub:streak-first";
const WAITING_MAX = 50;
const NONE: StreakView = { card: null, asking: false, moments: [], failed: false };

let view: StreakView = NONE;
// The reader that the card, the queue, and the waiting first section belong to.
let owner: string | null = null;
let waiting: Row[] = [];
let pending: Row[] = [];
let epoch = 0;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

export const streakView = (): StreakView => view;
export const serverStreakView = (): StreakView => NONE;
export function subscribeToStreak(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function show(next: StreakView) {
  view = next;
  for (const listener of listeners) listener();
}

export const browserZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

// Drops what this page holds for a reader who is not the reader now. Answers the key, or null.
function ready(): string | null {
  const key = accountKey();
  if (key !== owner) {
    epoch += 1;
    owner = key;
    waiting = [];
    pending = [];
    loading = null;
    view = NONE;
  }
  return key;
}

async function ask(method: string, path: string, body?: unknown, keepalive = false): Promise<unknown> {
  const key = ready();
  if (!key) return null;
  const at = epoch;
  const response = await fetch(path, {
    method,
    headers: { accept: "application/json", "x-hub-reader": key, ...(body === undefined ? {} : { "content-type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
    keepalive,
  });
  if (epoch !== at) return null;
  if (response.status === 401) {
    markSignedOut();
    return null;
  }
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

// The card of the reader, one time for each page load. A changed zone (a trip) goes to the account.
export function loadStreak(): Promise<void> {
  if (!streaksOn() || !ready()) return Promise.resolve();
  loading ??= (async () => {
    try {
      const card = (await ask("GET", "/api/me/streak")) as StreakCard | null;
      if (!card) return;
      show({ ...view, card, failed: false, moments: queueMoments(card.on ? card.fresh : []) });
      restorePending();
      if (card.on && card.zone !== browserZone()) void ask("PUT", "/api/me/streak", { zone: browserZone() }).catch(() => {});
    } catch {
      loading = null;
      show({ ...view, failed: true });
    }
  })();
  return loading;
}

function restorePending() {
  if (view.card?.on !== false || view.card.asked) return clearPending();
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(PENDING_KEY) ?? "null") as { key?: string; rows?: Row[] } | null;
    if (stored?.key === owner && Array.isArray(stored.rows) && stored.rows.length > 0) {
      pending = stored.rows;
      show({ ...view, asking: true });
    }
  } catch {
    // Storage is blocked: the first section waits in this page only.
  }
}

function clearPending() {
  pending = [];
  try {
    window.sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // Storage is blocked.
  }
}

// The sections of the paper on this page, from its paragraphs: "3:4.1" is in section 4 of Paper 3.
function pageSections(): { paperId: string; sections: { id: string; refs: string[] }[] } | null {
  const bySection = new Map<string, string[]>();
  let paperId: string | null = null;
  for (const el of document.querySelectorAll(".paper .para[id]")) {
    const match = /^(\d{1,3}):(\d{1,3})\.\d{1,3}$/.exec(el.id);
    if (!match) continue;
    paperId ??= match[1];
    const refs = bySection.get(match[2]) ?? [];
    refs.push(el.id);
    bySection.set(match[2], refs);
  }
  return paperId === null ? null : { paperId, sections: [...bySection].map(([id, refs]) => ({ id, refs })) };
}

// Paragraphs that the reader read or heard on this page. A section that they finish goes to the
// account, or waits for the question when the reader was not asked yet.
export function noteParagraphs(how: "read" | "heard", refs: readonly string[], now: Date = new Date()): void {
  if (!streaksOn() || refs.length === 0) return;
  const key = ready();
  if (!key) return;
  const card = view.card;
  // A reader who said no keeps no day log.
  if (card && !card.on && card.asked) return;
  const day = readingDay(now, browserZone());
  (how === "read" ? noteRead : noteHeard)(key, day, refs);
  const page = pageSections();
  if (!page) return;
  const rows = finished(key, day, page.sections).map((done) => ({ day, paperId: page.paperId, ...done }));
  if (rows.length === 0) return;
  if (card?.on) {
    for (const row of rows) if (waiting.length < WAITING_MAX) waiting.push(row);
    void flushSections();
    return;
  }
  pending = [...pending, ...rows].slice(0, WAITING_MAX);
  try {
    window.sessionStorage.setItem(PENDING_KEY, JSON.stringify({ key, rows: pending }));
  } catch {
    // Storage is blocked: the first section waits in this page only.
  }
  // The question waits for the card: a reader who said no on another device is not asked again.
  void loadStreak().then(() => {
    if (view.card && !view.card.on && !view.card.asked) show({ ...view, asking: true });
  });
}

export async function flushSections(keepalive = false): Promise<void> {
  if (!ready() || waiting.length === 0) return;
  const rows = waiting;
  waiting = [];
  const at = epoch;
  try {
    const answer = (await ask("POST", "/api/me/sections", { rows }, keepalive)) as { ok?: boolean; card?: StreakCard } | null;
    if (answer?.card) show({ ...view, card: answer.card, moments: queueMoments(answer.card.on ? answer.card.fresh : []) });
  } catch {
    // No connection, or the account refused for now. The rows hold their day, so they can go later.
    if (epoch === at) waiting = [...rows, ...waiting].slice(0, WAITING_MAX);
  }
}

// Passages that the reader read on a page of a world text. A finished page goes to the account for the
// marks, only while the streak is on; it never counts as a day of the streak. One page is sent at a time.
let sendingText: string | null = null;
export function noteTextPassages(work: string, page: string, refs: readonly string[]): void {
  if (!streaksOn() || refs.length === 0 || !view.card?.on) return;
  const key = ready();
  if (!key) return;
  const all = [...document.querySelectorAll(".paper.work .para[id]")].map((el) => el.id);
  if (!noteTextRead(key, work, page, refs, all) || sendingText === `${work}/${page}`) return;
  void sendTextPage(key, work, page);
}

async function sendTextPage(key: string, work: string, page: string): Promise<void> {
  sendingText = `${work}/${page}`;
  const at = epoch;
  try {
    const answer = (await ask("POST", "/api/me/texts", { work, page })) as { saved?: boolean; card?: StreakCard } | null;
    if (epoch !== at) return;
    // A page that the account refused is not sent again either: only a failed request tries again.
    textPageSent(key, work, page);
    if (answer?.card) show({ ...view, card: answer.card, moments: queueMoments(answer.card.on ? answer.card.fresh : []) });
  } catch {
    // No connection: the page stays in the log, and the next passage read on it sends it again.
  } finally {
    sendingText = null;
  }
}

// New marks wait to play: the lower tier first, and each id one time.
function queueMoments(ids: readonly string[]): string[] {
  const all = [...view.moments, ...ids.filter((id) => !view.moments.includes(id))];
  return all.sort((a, b) => (markById(a)?.tier ?? 0) - (markById(b)?.tier ?? 0));
}

export function momentPlayed(id: string): void {
  show({ ...view, moments: view.moments.filter((moment) => moment !== id) });
}

// The first use of a tool of the Hub: search, parallels, terms, a note, an image, a share.
export async function earnToolMark(id: string): Promise<void> {
  const card = view.card;
  if (!streaksOn() || !card?.on || card.marks[id]) return;
  // The mark shows at once in this page; the account keeps the first time.
  show({ ...view, card: { ...card, marks: { ...card.marks, [id]: new Date().toISOString() } } });
  try {
    const answer = (await ask("POST", "/api/me/marks", { id })) as { fresh?: string[] } | null;
    if (answer?.fresh?.length) show({ ...view, moments: queueMoments(answer.fresh) });
  } catch {
    // No connection: the next use tries again.
    const now = view.card;
    if (now?.on) show({ ...view, card: { ...now, marks: Object.fromEntries(Object.entries(now.marks).filter(([key]) => key !== id)) } });
  }
}

// The answer to the question. A yes sends the first section that waited.
export async function answerStreak(yes: boolean, goal: Goal): Promise<boolean> {
  track("streak_asked", { answer: yes ? "yes" : "no", goal });
  const patch = yes ? { on: true, asked: true, goal, zone: browserZone() } : { asked: true };
  try {
    const answer = (await ask("PUT", "/api/me/streak", patch)) as { saved?: boolean } | null;
    if (!answer?.saved) return false;
  } catch {
    return false;
  }
  show({ ...view, asking: false });
  if (yes) {
    waiting = [...pending, ...waiting].slice(0, WAITING_MAX);
    clearPending();
    loading = null;
    await flushSections();
    await loadStreak();
  } else {
    clearPending();
    loading = null;
    await loadStreak();
  }
  return true;
}

// A change of a setting from /you or /notifications: on, off, the goal, the hour.
export async function changeStreakSettings(patch: { on?: boolean; goal?: Goal; hour?: number }): Promise<boolean> {
  try {
    const answer = (await ask("PUT", "/api/me/streak", { ...patch, asked: true, zone: browserZone() })) as { saved?: boolean } | null;
    if (!answer?.saved) return false;
  } catch {
    return false;
  }
  loading = null;
  await loadStreak();
  return true;
}

export function openStreakQuestion(): void {
  show({ ...view, asking: true });
}
// A close with no answer: the section that waited goes, and the next finished section asks again.
export function closeStreakQuestion(): void {
  clearPending();
  show({ ...view, asking: false });
}

// A sign-out: nothing of the reader stays in this browser.
export function forgetStreak(): void {
  epoch += 1;
  owner = null;
  waiting = [];
  loading = null;
  clearPending();
  clearDayLog();
  clearTextLog();
  show(NONE);
}

export function resetStreakForTest(): void {
  forgetStreak();
  listeners.clear();
}
