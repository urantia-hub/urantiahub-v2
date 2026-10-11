// The end of this device as one that gets notices. A notice can show a reader's place, and a device
// can have a second reader, so a device must not get the notices of a reader who signed out.

const TELL_MS = 3000;

async function subscription(): Promise<PushSubscription | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration("/");
  return (await registration?.pushManager?.getSubscription()) ?? null;
}

// For a sign-out: the account forgets the device, and the browser ends it. It never throws, and it
// does not wait long for the account: the browser ends the device in each case.
export async function endDevice(key: string | null): Promise<void> {
  try {
    const current = await subscription();
    if (!current) return;
    if (key) {
      const told = fetch("/api/me/notices/device", {
        method: "DELETE",
        headers: { accept: "application/json", "content-type": "application/json", "x-hub-reader": key },
        body: JSON.stringify({ endpoint: current.endpoint }),
      }).catch(() => null);
      await Promise.race([told, new Promise((resolve) => setTimeout(resolve, TELL_MS))]);
    }
    await current.unsubscribe();
  } catch {
    // No device to end.
  }
}

// The session is gone, or the reader of this browser changed. The account cannot be told with that
// session, so the browser ends the device, and the account drops it at the next notice.
export const forgetDevice = (): Promise<void> => endDevice(null);
