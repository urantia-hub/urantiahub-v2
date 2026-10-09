// Keeps the place and the reader settings of a signed-in reader the same on each device.
// The browser stays the first source on this device: the page paints from it before any request.
// Each value holds the time of its last change, and the newer one wins.

import { applyTextSize, currentTextSize, subscribeToTextSize } from "@/lib/text-size";
import { applyTheme, currentTheme, subscribeToTheme } from "@/lib/theme";
import { readLastRead, storeLastRead, subscribeToLastRead } from "@/reader/last-read";
import { accountState, markSignedOut } from "./client";
import { newer, parsePlace, parseSettings, type Place, type Settings } from "./reader-data";

// When the reader last changed a setting in this browser.
export const SETTINGS_AT_KEY = "hub:reader-at";
const PLACE_EVERY_MS = 20_000;

let running = false;
// True while a value from the account is applied here, so that it is not sent back.
let applying = false;
let placeSentAt = 0;
let placeTimer: number | undefined;
let placeWaiting: Place | null = null;

const signedIn = () => accountState().status === "in";

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

async function send(path: string, value: unknown, keepalive = false): Promise<void> {
  try {
    const response = await fetch(path, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(value), keepalive });
    if (response.status === 401) markSignedOut();
  } catch {
    // No connection. The browser holds the value, and the next change or visit sends it.
  }
}

function sendPlaceNow(keepalive = false) {
  window.clearTimeout(placeTimer);
  placeTimer = undefined;
  const place = placeWaiting;
  placeWaiting = null;
  if (!place || !signedIn()) return;
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

function onPlace() {
  if (applying || !signedIn()) return;
  const place = readLastRead();
  if (place && place.at > 0) queuePlace(place);
}

function onSetting() {
  if (applying) return;
  const at = Date.now();
  stampSettings(at);
  if (signedIn()) void send("/api/me/settings", { ...browserSettings(), at });
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
  let body: { place?: unknown; settings?: unknown };
  try {
    const response = await fetch("/api/me/reader", { headers: { accept: "application/json" } });
    if (response.status === 401) return markSignedOut();
    if (!response.ok) return;
    body = (await response.json()) as typeof body;
  } catch {
    return;
  }

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
    if (document.visibilityState === "hidden") sendPlaceNow(true);
  });
}

export const pullFromAccount = pull;
