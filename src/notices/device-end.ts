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

// The mark goes first in each case: from that moment the worker shows no notice, also when the
// browser then fails to end the device.
async function end(tell: string | null): Promise<void> {
  await forget();
  try {
    const current = await subscription();
    if (!current) return;
    if (tell) {
      const told = fetch("/api/me/notices/device", {
        method: "DELETE",
        headers: { accept: "application/json", "content-type": "application/json", "x-hub-reader": tell },
        body: JSON.stringify({ endpoint: current.endpoint }),
      }).catch(() => null);
      await Promise.race([told, new Promise((resolve) => setTimeout(resolve, TELL_MS))]);
    }
    await current.unsubscribe();
  } catch {
    // The browser did not end the device. The mark is gone, so the worker shows nothing and ends it
    // at the next notice, and the next check tries again.
  }
}

// For a sign-out: the account forgets the device, and the browser ends it. It never throws, and it
// does not wait long for the account.
export const endDevice = (key: string | null): Promise<void> => end(key);

// Each time the page learns who is signed in: a device that gets notices must be the device of that
// reader. If no reader is signed in, if it is another reader, or if this browser does not know whose
// device it is, the device ends. So the rule also holds when the session ended while no page was open.
// The account cannot be told with no session: it drops the device at the next notice.
export async function checkDevice(key: string | null): Promise<void> {
  if (key !== null && (await owner()) === key) return;
  await end(null);
}
