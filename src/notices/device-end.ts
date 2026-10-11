// Whose device this is for notices, and the end of it. A notice can show a reader's place, and a
// device can have a second reader, so a device must get the notices of one reader only: the one who
// turned it on, while that reader is signed in.

const TELL_MS = 3000;
// The mark is in the cache storage of the site, because the service worker reads it too. The worker
// shows a notice only when the notice is for the reader of the mark (public/sw.js).
export const OWNER_CACHE = "hub-notices";
export const OWNER_PATH = "/__notices-owner";

async function subscription(): Promise<PushSubscription | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration("/");
  return (await registration?.pushManager?.getSubscription()) ?? null;
}

async function owner(): Promise<string | null> {
  try {
    const kept = await (await caches.open(OWNER_CACHE)).match(OWNER_PATH);
    return kept ? await kept.text() : null;
  } catch {
    return null;
  }
}

async function forget(): Promise<void> {
  try {
    await (await caches.open(OWNER_CACHE)).delete(OWNER_PATH);
  } catch {
    // Nothing was kept.
  }
}

// Call it before the account saves this device for the reader. False when the browser cannot keep
// the mark: the device must not be saved then, because the worker would show nothing.
export async function claimDevice(key: string): Promise<boolean> {
  try {
    await (await caches.open(OWNER_CACHE)).put(OWNER_PATH, new Response(key));
    return (await owner()) === key;
  } catch {
    return false;
  }
}

const text = (buffer: ArrayBuffer | null) => (buffer ? btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : "");

// The device ends in the browser. The mark goes first: from that moment the worker shows no notice,
// also when the browser then fails to end the device.
async function end(): Promise<void> {
  await forget();
  try {
    await (await subscription())?.unsubscribe();
  } catch {
    // The browser did not end the device. The mark is gone, so the worker shows nothing and ends it
    // at the next notice, and the next check tries again.
  }
}

// For a sign-out. The mark goes first. Then the account keeps the device with no notice: it sends
// nothing to it, and it still knows it, so the same reader can get it back after the next sign-in.
// If the account cannot be told, the browser ends the device. It never throws, and it does not wait long.
export async function endDevice(key: string | null): Promise<void> {
  await forget();
  try {
    const current = await subscription();
    if (!current) return;
    const p256dh = text(current.getKey("p256dh"));
    const auth = text(current.getKey("auth"));
    let paused = false;
    if (key && p256dh && auth) {
      const told = fetch("/api/me/notices/device", {
        method: "PUT",
        headers: { accept: "application/json", "content-type": "application/json", "x-hub-reader": key },
        body: JSON.stringify({ endpoint: current.endpoint, p256dh, auth, kinds: [], label: "" }),
      })
        .then(async (response) => response.ok && ((await response.json()) as { saved?: unknown }).saved === true)
        .catch(() => false);
      paused = (await Promise.race([told, new Promise<boolean>((resolve) => setTimeout(() => resolve(false), TELL_MS))])) === true;
    }
    if (!paused) await current.unsubscribe();
  } catch {
    // No device to end.
  }
}

// What this device got, and for which reader. It stays in this browser after the device ends, so
// that the same reader gets the device back after the next sign-in, with no press. It holds the key
// of the reader and the names of the notices, and nothing else.
const LAST = "hub.notices.last";
type Last = { owner: string; kinds: string[] };

export function rememberDevice(owner: string, kinds: readonly string[]): void {
  try {
    if (kinds.length === 0) localStorage.removeItem(LAST);
    else localStorage.setItem(LAST, JSON.stringify({ owner, kinds }));
  } catch {
    // The browser keeps nothing. The reader then turns the device on by hand.
  }
}

function remembered(): Last | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(LAST) ?? "null");
    if (typeof value !== "object" || value === null) return null;
    const { owner, kinds } = value as Record<string, unknown>;
    return typeof owner === "string" && Array.isArray(kinds) && kinds.every((kind) => typeof kind === "string") && kinds.length > 0 ? { owner, kinds } : null;
  } catch {
    return null;
  }
}

// Each time the page learns who is signed in: a device that gets notices must be the device of that
// reader. If no reader is signed in, if it is another reader, or if this browser does not know whose
// device it is, the device ends. So the rule also holds when the session ended while no page was open.
// The account cannot be told with no session: it drops the device at the next notice.
//
// One case does not end the device: the same reader signs in again after a sign-out on this device.
// The device comes back with its notices, but only if the account still knows it. A reader who turned
// all off, on this device or on another one, removed it from the account, and it stays off.
export async function checkDevice(key: string | null): Promise<void> {
  if (key !== null && (await owner()) === key) return;
  const last = remembered();
  if (key !== null && last?.owner === key) {
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        const { restoreDevice } = await import("./device-on");
        if (await restoreDevice(key, last.kinds)) return;
      }
    } catch {
      // The device ends below. The Notifications page turns it on with one press.
    }
  }
  await end();
}
