// This browser as a device that gets a push. Push is a setting of the account: a reader who turned a
// push on gets it on each device where the browser allows notices and the reader is signed in.
// So this file does two things: it tells the account that this device is here, and that it left.
//
// The guard for a shared device is in the worker (public/sw.js): before it shows a notice, it asks
// the site who is signed in. Nothing here decides who sees a notice.

import { accountKey } from "@/account/client";
import { readerCall } from "@/account/reader-call";
import { deviceState, subscribeDevice } from "./push";

const TELL_MS = 3000;
// Sent when this device was added to the account with no press.
export const DEVICE_EVENT = "hub:device";

// Adds this device to the account of the reader. It asks the reader if the browser did not ask yet.
// False when the reader or the browser said no, when the reader changed, or when the account did not take it.
export async function registerDevice(mine: string): Promise<boolean> {
  // The browser can ask for a long time, and the reader can change in it.
  const subscribed = await subscribeDevice();
  if (!subscribed || accountKey() !== mine) return false;
  // The server refuses the save when the session is not the session of this reader.
  const answer = (await readerCall("/api/me/notices/device", { method: "PUT", body: JSON.stringify({ ...subscribed, kinds: [] }) })) as { saved?: unknown } | null;
  return answer?.saved === true;
}

// Each time the page learns that a reader is signed in. If the browser already allows notices and the
// reader has a push on, this device joins the account with no press and no question. So a reader who
// signs in again, or whose device got a new address, does nothing.
export async function syncDevice(key: string | null): Promise<void> {
  try {
    if (key === null || deviceState() !== "allowed") return;
    const notices = (await readerCall("/api/me/notices")) as { settings?: { push?: Record<string, boolean> } } | null;
    if (accountKey() !== key || !notices?.settings?.push || !Object.values(notices.settings.push).some(Boolean)) return;
    if (await registerDevice(key)) window.dispatchEvent(new Event(DEVICE_EVENT));
  } catch {
    // The device is not added. The Notifications page adds it with one press.
  }
}

// For a sign-out, while the session can still tell the account: the account forgets this device, so
// no push is sent to it. The browser then ends its registration (dropDevice). If the account cannot
// be told, the worker stops the next notice. It never throws, and it does not wait long.
export async function endDevice(key: string | null): Promise<void> {
  try {
    if (!key || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration("/");
    const current = await registration?.pushManager?.getSubscription();
    if (!current) return;
    const told = fetch("/api/me/notices/device", {
      method: "DELETE",
      headers: { accept: "application/json", "content-type": "application/json", "x-hub-reader": key },
      body: JSON.stringify({ endpoint: current.endpoint }),
    }).catch(() => null);
    await Promise.race([told, new Promise((resolve) => setTimeout(resolve, TELL_MS))]);
  } catch {
    // No device to forget.
  }
}

// The page learned that nobody is signed in: by a sign-out, or because the sign-in ended by itself.
// The browser ends its registration, so the address that the account can still hold reaches no
// device, and the account removes it at the next send. A reader who signs in here gets a new
// registration with no press (syncDevice). It never throws.
export async function dropDevice(): Promise<void> {
  try {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration("/");
    await (await registration?.pushManager?.getSubscription())?.unsubscribe();
  } catch {
    // No device to end. The worker stops a notice for a reader who is not signed in.
  }
}
