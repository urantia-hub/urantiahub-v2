// Keeps the place and the reader settings of a signed-in reader the same on each device.
// The browser stays the first source on this device: the page paints from it before any request.
// Each value holds the time of its last change, and the newer one wins.

import { applyTextSize, currentTextSize, subscribeToTextSize } from "@/lib/text-size";
import { applyTheme, currentTheme, subscribeToTheme } from "@/lib/theme";
import { clearLastRead, readLastRead, storeLastRead, subscribeToLastRead } from "@/reader/last-read";
import { accountKey, markSignedOut, refreshAccount } from "./client";
import { clearProgress } from "./progress";
import { newer, parsePlace, parseSettings, type Place, type Settings } from "./reader-data";

// When the reader last changed a setting in this browser.
export const SETTINGS_AT_KEY = "hub:reader-at";
// While the place and the settings in this browser are those of a signed-in reader: the key of that reader.
export const ACCOUNT_DATA_KEY = "hub:account-data";
const PLACE_EVERY_MS = 20_000;
const READ_EVERY_MS = 30_000;
const READ_BATCH = 200;
// A long session with no connection must not grow without limit.
const READ_WAITING_MAX = 1000;

let running = false;
// True while a value from the account is applied here, so that it is not sent back.
let applying = false;
let placeSentAt = 0;
let placeTimer: number | undefined;
let placeWaiting: Place | null = null;
// The paragraphs that the reader read, and that the account does not hold yet.
const readWaiting = new Set<string>();
let readTimer: number | undefined;
// Goes up each time the reader's data is removed from this browser. An answer that was on its way
// before that is for a reader who is gone, and is dropped.
let epoch = 0;

// The reader that the waiting place and the waiting read marks belong to.
let collectedFor: string | null = null;

// A request can go out only when the page knows which reader it speaks for. The reader can change with
// no sign-out on this page: another tab signed out, and another person signed in there. What this page
// collected is then the first reader's. It is dropped here, before anything is added or sent.
function ready(): boolean {
  const key = accountKey();
  if (key !== collectedFor) {
    dropCollected();
    collectedFor = key;
  }
  return key !== null;
}

function dropCollected(): void {
  epoch += 1;
  window.clearTimeout(placeTimer);
  placeTimer = undefined;
  placeWaiting = null;
  placeSentAt = 0;
  window.clearTimeout(readTimer);
  readTimer = undefined;
  readWaiting.clear();
  clearProgress();
}

function settingsAt(): number {
  try {
    const at = Number(window.localStorage.getItem(SETTINGS_AT_KEY));
    return Number.isFinite(at) && at > 0 ? at : 0;
  } catch {
    return 0;
  }
}

const browserSettings = (): Settings => ({ theme: currentTheme(), textSize: currentTextSize(), at: settingsAt() });

function stampSettings(at: number) {
  try {
    window.localStorage.setItem(SETTINGS_AT_KEY, String(at));
  } catch {
    // Storage is blocked. The settings then follow the account at each visit.
  }
}

// The server says that the session is not this page's reader any more: another tab signed out, or
// another reader signed in. Nothing of the reader before stays, and the page asks who is here now.
async function readerChanged(): Promise<void> {
  forgetAccountData();
  await refreshAccount();
}

async function send(path: string, value: unknown, keepalive = false): Promise<void> {
  const key = accountKey();
  if (!key || !ready()) return;
  try {
    const response = await fetch(path, { method: "PUT", headers: { "content-type": "application/json", "x-hub-reader": key }, body: JSON.stringify(value), keepalive });
    if (response.status === 401) markSignedOut();
    if (response.status === 409) await readerChanged();
  } catch {
    // No connection. The browser holds the value, and the next change or visit sends it.
  }
}

function sendPlaceNow(keepalive = false) {
  window.clearTimeout(placeTimer);
  placeTimer = undefined;
  // The check of the reader comes first: it drops a place that waits for the reader before.
  if (!ready()) return;
  const place = placeWaiting;
  placeWaiting = null;
  if (!place) return;
  placeSentAt = Date.now();
  void send("/api/me/place", place, keepalive);
}

// At most one request in 20 seconds. The newest place waits, and goes out when the reader leaves.
function queuePlace(place: Place) {
  placeWaiting = place;
  const wait = placeSentAt + PLACE_EVERY_MS - Date.now();
  if (wait <= 0) sendPlaceNow();
  else placeTimer ??= window.setTimeout(sendPlaceNow, wait);
}

// Paragraphs that the reader read. They go out as one batch, at most one time in 30 seconds, and when
// the reader leaves the page. A reader who is not signed in keeps no record.
export function queueRead(refs: readonly string[]): void {
  if (!ready()) return;
  for (const ref of refs) if (readWaiting.size < READ_WAITING_MAX) readWaiting.add(ref);
  if (readWaiting.size > 0) readTimer ??= window.setTimeout(() => void flushRead(), READ_EVERY_MS);
}

export async function flushRead(keepalive = false): Promise<void> {
  window.clearTimeout(readTimer);
  readTimer = undefined;
  if (!ready() || readWaiting.size === 0) return;
  const key = accountKey();
  if (!key) return;
  const refs = [...readWaiting].slice(0, READ_BATCH);
  for (const ref of refs) readWaiting.delete(ref);
  const at = epoch;
  // A batch that did not arrive waits for the next try, unless the reader is gone by then.
  const again = () => {
    if (epoch !== at) return;
    for (const ref of refs) if (readWaiting.size < READ_WAITING_MAX) readWaiting.add(ref);
  };
  try {
    const response = await fetch("/api/me/read", { method: "POST", headers: { "content-type": "application/json", "x-hub-reader": key }, body: JSON.stringify({ refs }), keepalive });
    if (response.status === 401) return markSignedOut();
    if (response.status === 409) return readerChanged();
    if (!response.ok) again();
  } catch {
    again();
  }
  if (readWaiting.size > 0 && epoch === at) readTimer ??= window.setTimeout(() => void flushRead(), READ_EVERY_MS);
}

function onPlace() {
  // Before the server said who is signed in, the place only stays in the browser. The pull sends it.
  if (applying || !ready()) return;
  const place = readLastRead();
  if (place && place.at > 0) queuePlace(place);
}

function onSetting() {
  if (applying) return;
  const at = Date.now();
  stampSettings(at);
  if (ready()) void send("/api/me/settings", { ...browserSettings(), at });
}

export function markAccountData(key: string): void {
  try {
    window.localStorage.setItem(ACCOUNT_DATA_KEY, key);
  } catch {
    // Storage is blocked. Then nothing of the reader is kept here.
  }
}

// When a signed-in reader is signed out, by a press or because the session ended: the reader's place
// leaves this browser, and so does the time of the settings. A second person can sign in here, and the
// first person's place must not show to them or go into their account. The account still holds it.
// The theme and the text size stay: they are not personal, and the page must not flash.
export function forgetAccountData(): void {
  dropCollected();
  try {
    if (window.localStorage.getItem(ACCOUNT_DATA_KEY) === null) return;
    window.localStorage.removeItem(SETTINGS_AT_KEY);
    window.localStorage.removeItem(ACCOUNT_DATA_KEY);
  } catch {
    return;
  }
  applying = true;
  try {
    clearLastRead();
  } finally {
    applying = false;
  }
}

function applyFromAccount(run: () => void) {
  applying = true;
  try {
    run();
  } finally {
    applying = false;
  }
}

async function pull(): Promise<void> {
  const key = accountKey();
  if (!key || !ready()) return;
  // What this browser holds can be from the reader before: their session ended, and this reader signed
  // in with no page load in between. It is not this reader's, so it goes first.
  let owner: string | null = null;
  try {
    owner = window.localStorage.getItem(ACCOUNT_DATA_KEY);
  } catch {
    // Storage is blocked: nothing is kept here.
  }
  if (owner !== null && owner !== key) forgetAccountData();
  // The mark comes before the request: a pull that fails still leaves it, and a sign-out cleans up by it.
  markAccountData(key);
  const at = epoch;
  const stale = () => epoch !== at || accountKey() !== key;

  let body: { place?: unknown; settings?: unknown };
  try {
    const response = await fetch("/api/me/reader", { headers: { accept: "application/json", "x-hub-reader": key } });
    if (response.status === 401) return markSignedOut();
    if (response.status === 409) return readerChanged();
    if (!response.ok) return;
    body = (await response.json()) as typeof body;
  } catch {
    return;
  }
  // The reader was signed out, or changed, while the answer was on its way.
  if (stale()) return;

  const place = newer<Place>(readLastRead(), parsePlace(body.place));
  if (place.from === "account" && place.value) {
    const value = place.value;
    applyFromAccount(() => storeLastRead(value));
  } else if (place.from === "browser" && place.value && place.value.at > 0) queuePlace(place.value);

  const settings = newer<Settings>(browserSettings(), parseSettings(body.settings));
  if (settings.from === "account" && settings.value) {
    const value = settings.value;
    applyFromAccount(() => {
      if (value.theme !== currentTheme()) applyTheme(value.theme);
      if (value.textSize !== currentTextSize()) applyTextSize(value.textSize);
      stampSettings(value.at);
    });
  } else if (settings.from === "browser" && settings.value && settings.value.at > 0) void send("/api/me/settings", settings.value);
}

// Starts one time, when a reader is signed in. The listeners stay for the life of the page; each one
// does nothing for a reader who is signed out. A setting change is stamped for each reader, so that a
// later sign-in knows which side is newer.
export function startSync(): void {
  if (running) return;
  running = true;
  subscribeToTheme(onSetting);
  subscribeToTextSize(onSetting);
  subscribeToLastRead(onPlace);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "hidden") return;
    sendPlaceNow(true);
    void flushRead(true);
  });
  // Another tab signed out, or another reader signed in there: this tab asks who is here now.
  window.addEventListener("storage", (event) => {
    if (event.key === ACCOUNT_DATA_KEY && event.newValue !== accountKey()) void refreshAccount();
  });
}

export const pullFromAccount = pull;

export function resetSyncForTest(): void {
  window.clearTimeout(placeTimer);
  placeTimer = undefined;
  placeWaiting = null;
  placeSentAt = 0;
  window.clearTimeout(readTimer);
  readTimer = undefined;
  readWaiting.clear();
  applying = false;
  epoch = 0;
  collectedFor = null;
}
