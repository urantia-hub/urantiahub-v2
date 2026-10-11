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
    localStorage.removeItem(OWNER);
  } catch {
    // No device to end.
  }
}

// Which reader this device gets notices for. It is the key of the reader, kept in this browser.
const OWNER = "hub.notices.owner";

function owner(): string | null {
  try {
    return localStorage.getItem(OWNER);
  } catch {
    return null;
  }
}

// Call it when the account saved this device for the reader.
export function claimDevice(key: string): void {
  try {
    localStorage.setItem(OWNER, key);
  } catch {
    // The browser keeps nothing. The next check then ends the device, which is the safe side.
  }
}

// Each time the page learns who is signed in: a device that gets notices must be the device of that
// reader. If no reader is signed in, if it is another reader, or if this browser does not know whose
// device it is, the browser ends the device. So the rule also holds when the session ended while no
// page was open. The account cannot be told with no session: it drops the device at the next notice.
export async function checkDevice(key: string | null): Promise<void> {
  try {
    if (key !== null && owner() === key) return;
    const current = await subscription();
    if (current) await current.unsubscribe();
    localStorage.removeItem(OWNER);
  } catch {
    // No device to end.
  }
}
