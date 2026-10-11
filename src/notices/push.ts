// What this browser can do with notices, and the calls that make this device one that gets them.

export type DeviceState =
  // This browser cannot show a notice of a website, or the site has no key for it yet.
  | "none"
  // An iPhone or iPad whose browser shows a notice only for a site on the home screen.
  | "ios"
  // The browser did not ask the reader yet.
  | "ask"
  | "allowed"
  | "blocked";

type Env = {
  userAgent: string;
  touchPoints: number;
  standalone: boolean;
  hasPush: boolean;
  permission: "default" | "granted" | "denied" | null;
  key: string;
};

export const PUSH_KEY = process.env.NEXT_PUBLIC_VAPID_KEY ?? "";

function browserEnv(): Env {
  const nav = navigator as Navigator & { standalone?: boolean };
  return {
    userAgent: nav.userAgent,
    touchPoints: nav.maxTouchPoints ?? 0,
    standalone: nav.standalone === true || (typeof matchMedia === "function" && matchMedia("(display-mode: standalone)").matches),
    hasPush: "serviceWorker" in nav && "PushManager" in window && "Notification" in window,
    permission: "Notification" in window ? Notification.permission : null,
    key: PUSH_KEY,
  };
}

// An iPad says that it is a Mac. A Mac has no touch screen.
const isApple = (env: Env) => /iPhone|iPad|iPod/.test(env.userAgent) || (/Macintosh/.test(env.userAgent) && env.touchPoints > 1);

export function deviceState(env: Env = browserEnv()): DeviceState {
  if (!env.key) return "none";
  if (isApple(env) && !env.standalone) return "ios";
  if (!env.hasPush || env.permission === null) return "none";
  return env.permission === "granted" ? "allowed" : env.permission === "denied" ? "blocked" : "ask";
}

// A coarse name for the list of devices, for example "Chrome on Android". Never the full text.
export function deviceLabel(userAgent: string, touchPoints = 0): string {
  const ua = userAgent;
  const system = /iPhone|iPod/.test(ua) ? "iPhone" : /iPad/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1) ? "iPad" : /Android/.test(ua) ? "Android" : /Macintosh|Mac OS X/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\/|CriOS\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "";
  return [browser || "A browser", system].filter(Boolean).join(" on ");
}

// The steps to allow notices again, for the browser of the reader. A website cannot remove a block.
export function unblockSteps(userAgent: string): string[] {
  if (/Firefox\//.test(userAgent)) return ["Press the icon at the left of the address.", "Next to “Send notifications”, remove “Blocked”."];
  if (/Safari\//.test(userAgent) && !/Chrome\/|CriOS\/|Edg\//.test(userAgent)) return ["Open Safari, then Settings, then Websites, then Notifications.", "Set UrantiaHub to “Allow”."];
  return ["Press the icon at the left of the address.", "Press “Notifications”, then “Allow”."];
}

const bytes = (base64url: string) => Uint8Array.from(atob(base64url.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const text = (buffer: ArrayBuffer | null) => (buffer ? btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : "");

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const worker = () => navigator.serviceWorker.register("/sw.js", { scope: "/" });

// The address of this device if it is one that gets notices now, or null.
export async function currentEndpoint(): Promise<string | null> {
  try {
    if (deviceState() !== "allowed") return null;
    const registration = await navigator.serviceWorker.getRegistration("/");
    return (await registration?.pushManager.getSubscription())?.endpoint ?? null;
  } catch {
    return null;
  }
}

export type Subscribed = { endpoint: string; p256dh: string; auth: string; label: string };

// Asks the reader if the browser did not, and makes this device one that gets notices.
// Null when the reader said no, or when the browser could not do it.
export async function subscribeDevice(): Promise<Subscribed | null> {
  try {
    if (!PUSH_KEY || (await Notification.requestPermission()) !== "granted") return null;
    const registration = await worker();
    await navigator.serviceWorker.ready;
    const subscription = (await registration.pushManager.getSubscription()) ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes(PUSH_KEY) }));
    const p256dh = text(subscription.getKey("p256dh"));
    const auth = text(subscription.getKey("auth"));
    if (!p256dh || !auth) return null;
    return { endpoint: subscription.endpoint, p256dh, auth, label: deviceLabel(navigator.userAgent, navigator.maxTouchPoints) };
  } catch {
    return null;
  }
}

// This device gets no more notices, also if the account could not be told.
export async function unsubscribeDevice(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    await (await registration?.pushManager.getSubscription())?.unsubscribe();
  } catch {
    // Nothing to end.
  }
}
