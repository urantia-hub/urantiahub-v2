// Whose device this is for notices, and the end of it. A notice can show a reader's place, and a
// device can have a second reader, so a device must get the notices of one reader only: the one who
// turned it on, while that reader is signed in.

const TELL_MS = 3000;
// Sent when this device got its notices back by itself.
export const DEVICE_EVENT = "hub:device";
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

// What this device gets, and for which reader. It stays in this browser, so that the same reader gets
// the device back after a sign-out and a new sign-in, with no press. It holds the key of the reader
// and the names of the notices, and nothing else. `paused`: the reader signed out here, and the
// account keeps the device with no notice.
const LAST = "hub.notices.last";
type Last = { owner: string; kinds: string[]; paused: boolean };

function keep(last: Last | null): void {
  try {
    if (!last || last.kinds.length === 0) localStorage.removeItem(LAST);
    else localStorage.setItem(LAST, JSON.stringify(last));
  } catch {
    // The browser keeps nothing. The reader then turns the device on by hand.
  }
}

export const rememberDevice = (owner: string, kinds: readonly string[]): void => keep({ owner, kinds: [...kinds], paused: false });

function remembered(): Last | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(LAST) ?? "null");
    if (typeof value !== "object" || value === null) return null;
    const { owner, kinds, paused } = value as Record<string, unknown>;
    return typeof owner === "string" && Array.isArray(kinds) && kinds.every((kind) => typeof kind === "string") && kinds.length > 0 ? { owner, kinds, paused: paused === true } : null;
  } catch {
    return null;
  }
}

const reader = (key: string) => ({ accept: "application/json", "content-type": "application/json", "x-hub-reader": key });
const inTime = <T,>(work: Promise<T>, late: T): Promise<T> => Promise.race([work, new Promise<T>((resolve) => setTimeout(() => resolve(late), TELL_MS))]);

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

// The notices of this device in the account. A device that was turned on before this browser kept
// them has no record here, so the account is asked one time.
async function kindsOf(key: string, endpoint: string): Promise<string[]> {
  const last = remembered();
  if (last?.owner === key) return last.kinds;
  try {
    const response = await fetch("/api/me/notices", { headers: reader(key) });
    if (!response.ok) return [];
    const { devices } = (await response.json()) as { devices?: { endpointHash?: string; kinds?: unknown }[] };
    const hash = await sha256(endpoint);
    const kinds = devices?.find((device) => device.endpointHash === hash)?.kinds;
    return Array.isArray(kinds) ? kinds.filter((kind): kind is string => typeof kind === "string") : [];
  } catch {
    return [];
  }
}

// For a sign-out. The mark goes first: from that moment the worker shows no notice. Then the account
// keeps the device with no notice: it sends nothing to it, and it still knows it, so the same reader
// gets it back after the next sign-in. If the account cannot be told, the browser ends the device.
// It never throws, and it does not wait long.
export async function endDevice(key: string | null): Promise<void> {
  await forget();
  try {
    const current = await subscription();
    if (!current) return;
    const p256dh = text(current.getKey("p256dh"));
    const auth = text(current.getKey("auth"));
    let paused = false;
    if (key && p256dh && auth) {
      const kinds = await inTime(kindsOf(key, current.endpoint), []);
      const told = fetch("/api/me/notices/device", { method: "PUT", headers: reader(key), body: JSON.stringify({ endpoint: current.endpoint, p256dh, auth, kinds: [], label: "" }) })
        .then(async (response) => response.ok && ((await response.json()) as { saved?: unknown }).saved === true)
        .catch(() => false);
      paused = (await inTime(told, false)) === true;
      if (paused) keep({ owner: key, kinds, paused: true });
    }
    if (!paused) await current.unsubscribe();
  } catch {
    // No device to end.
  }
}

// Each time the page learns who is signed in. Three cases:
//
// 1. No reader is signed in. Nothing changes here. A sign-out by a press ended the notices already
//    (endDevice). A session that ended by itself is not a choice of the reader, so this page does
//    not end the device. The worker does, at the next notice: it asks who is signed in, shows one
//    plain notice that says "You are signed out", and ends the device (public/sw.js). A reader who wants to stop a device that is not at hand uses "Turn all off" on
//    another device, or deletes the account: both remove the device from the account, and no
//    notice is sent to it.
// 2. The reader of the device is signed in. Nothing changes. If that reader signed out here before,
//    the device gets its notices back, but only if the account still has it, with no notice.
//    A reader who turned all off removed it from the account, and it stays off.
// 3. Another reader is signed in, or this browser does not know whose device it is. The device ends:
//    one reader's notices never show for another reader.
export async function checkDevice(key: string | null): Promise<void> {
  if (key === null) return;
  if ((await owner()) === key) return;
  const last = remembered();
  if (last?.owner === key && last.paused) {
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        const { restoreDevice } = await import("./device-on");
        if (await restoreDevice(key, last.kinds)) {
          // A page that shows the devices reads them again.
          window.dispatchEvent(new Event(DEVICE_EVENT));
          return;
        }
      }
    } catch {
      // The device ends below. The Notifications page turns it on with one press.
    }
  }
  await end();
}
