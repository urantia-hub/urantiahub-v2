import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkDevice, claimDevice, endDevice, OWNER_CACHE, OWNER_PATH, rememberDevice } from "./device-end";

const on = vi.hoisted(() => ({ calls: [] as { key: string; kinds: string[] }[], restores: true }));
vi.mock("./device-on", () => ({
  restoreDevice: vi.fn(async (key: string, kinds: string[]) => {
    on.calls.push({ key, kinds });
    return on.restores;
  }),
}));

// A stand-in for the cache storage of a browser: one cache, with text values.
function storage(broken = false) {
  const kept = new Map<string, string>();
  const cache = {
    match: async (path: string) => (kept.has(path) ? new Response(kept.get(path)) : undefined),
    put: async (path: string, response: Response) => void kept.set(path, await response.text()),
    delete: async (path: string) => kept.delete(path),
  };
  vi.stubGlobal("caches", { open: async (name: string) => (broken || name !== OWNER_CACHE ? Promise.reject(new Error("no storage")) : cache) });
  return kept;
}
function device(endpoint: string | null, unsubscribe = vi.fn(async () => true)) {
  const key = (name: string) => new TextEncoder().encode(`${name}-key-of-the-device`).buffer;
  const current = endpoint ? { endpoint, unsubscribe, getKey: key } : null;
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { getRegistration: async () => ({ pushManager: { getSubscription: async () => current } }) } });
  return unsubscribe;
}
const ENDPOINT = "https://fcm.googleapis.com/fcm/send/abc";
const calls = () => vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === "PUT").map(([path, init]) => ({ path, method: init?.method, body: JSON.parse(String(init?.body)), reader: (init?.headers as Record<string, string>)["x-hub-reader"] }));

let kept: Map<string, string>;
beforeEach(() => {
  kept = storage();
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}")));
});
afterEach(() => {
  on.calls = [];
  on.restores = true;
  localStorage.clear();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "serviceWorker");
});

describe("whose device this is", () => {
  it("is kept where the worker can read it", async () => {
    expect(await claimDevice("k1")).toBe(true);
    expect(kept.get(OWNER_PATH)).toBe("k1");
  });

  it("is not claimed when the browser cannot keep the mark", async () => {
    storage(true);
    expect(await claimDevice("k1")).toBe(false);
  });
});

// The account, for a sign-out: it lists the devices, and it takes the pause.
function account(kinds: string[] | null, pause: () => Promise<Response> = async () => Response.json({ saved: true })) {
  vi.mocked(fetch).mockImplementation(async (_path, init) => {
    if (init?.method === "PUT") return pause();
    const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ENDPOINT)))].map((b) => b.toString(16).padStart(2, "0")).join("");
    return Response.json({ settings: {}, devices: kinds ? [{ id: "a", label: "x", kinds, endpointHash: hash }] : [] });
  });
}
const last = () => JSON.parse(localStorage.getItem("hub.notices.last") ?? "null") as unknown;

describe("a sign-out", () => {
  it("removes the mark first, then tells the account to keep the device with no notice", async () => {
    await claimDevice("k1");
    rememberDevice("k1", ["daily"]);
    const order: string[] = [];
    account(null, async () => {
      order.push(kept.has(OWNER_PATH) ? "told with mark" : "told");
      return Response.json({ saved: true });
    });
    const unsubscribe = device(ENDPOINT);
    await endDevice("k1");
    expect(order).toEqual(["told"]);
    const [call] = calls();
    expect(call).toMatchObject({ path: "/api/me/notices/device", method: "PUT", reader: "k1" });
    expect(call.body).toMatchObject({ endpoint: ENDPOINT, kinds: [] });
    // The account sends nothing to the device now, and still knows it. The browser keeps it for the same reader.
    expect(unsubscribe).not.toHaveBeenCalled();
    expect(last()).toEqual({ owner: "k1", kinds: ["daily"], paused: true });
  });

  // A device that was turned on before this browser kept its notices: the account knows them.
  it("asks the account which notices the device had, when this browser does not know", async () => {
    account(["daily", "releases"]);
    device(ENDPOINT);
    await endDevice("k1");
    expect(last()).toEqual({ owner: "k1", kinds: ["daily", "releases"], paused: true });
  });

  it.each([
    ["the account does not answer", async () => Promise.reject(new Error("offline"))],
    ["the account refuses", async () => Response.json({ saved: false }, { status: 409 })],
    ["the account did not save it", async () => Response.json({ saved: false })],
  ])("ends the device in the browser, and keeps no pause, when %s", async (_case, answer) => {
    account(["daily"], answer as () => Promise<Response>);
    const unsubscribe = device(ENDPOINT);
    await endDevice("k1");
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(last()).toBeNull();
  });

  it("ends the device in the browser when no reader can be named", async () => {
    account(["daily"]);
    const unsubscribe = device(ENDPOINT);
    await endDevice(null);
    expect(fetch).not.toHaveBeenCalled();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  // The worker shows a notice only with the mark. So a browser that fails to end the device is still safe.
  it("leaves no mark when the browser fails to end the device", async () => {
    await claimDevice("k1");
    account(null, async () => Promise.reject(new Error("offline")));
    device(ENDPOINT, vi.fn(async () => Promise.reject(new Error("the browser refused"))));
    await endDevice("k1");
    expect(kept.has(OWNER_PATH)).toBe(false);
  });
});

describe("the check when the page learns who is signed in", () => {
  it("keeps the device of the reader who is signed in", async () => {
    const unsubscribe = device(ENDPOINT);
    await claimDevice("k1");
    await checkDevice("k1");
    expect(unsubscribe).not.toHaveBeenCalled();
    expect(kept.get(OWNER_PATH)).toBe("k1");
  });

  // A session that ends by itself is not a choice of the reader. The device keeps its notices
  // (Kelson, 2026-10-11). A sign-out by a press ended them before this check runs.
  it("changes nothing when no reader is signed in", async () => {
    const unsubscribe = device(ENDPOINT);
    await claimDevice("k1");
    await checkDevice(null);
    expect(unsubscribe).not.toHaveBeenCalled();
    expect(kept.get(OWNER_PATH)).toBe("k1");
    // And the same reader, signed in again, has the device as before.
    await checkDevice("k1");
    expect(unsubscribe).not.toHaveBeenCalled();
    expect(on.calls).toEqual([]);
  });

  it("ends the device when another reader is signed in, and when it is not known whose it is", async () => {
    for (const [claimed, now] of [["k1", "k2"], [null, "k1"]] as const) {
      kept.clear();
      const unsubscribe = device(ENDPOINT);
      if (claimed) await claimDevice(claimed);
      await checkDevice(now);
      expect(unsubscribe).toHaveBeenCalledTimes(1);
      expect(kept.has(OWNER_PATH)).toBe(false);
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("ends the device when the browser cannot read the mark", async () => {
    const unsubscribe = device(ENDPOINT);
    storage(true);
    await checkDevice("k1");
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});

// A sign-out stops the notices, because a device can have a second reader. The same reader must not
// have to turn the device on again after each sign-in (Kelson, 2026-10-11).
describe("a reader who signs out and signs in again on a device that had notices", () => {
  const allow = (permission: string) => vi.stubGlobal("Notification", { permission });
  async function signedOut(key: string, kinds: string[]) {
    await claimDevice(key);
    rememberDevice(key, kinds);
    account(kinds);
    const unsubscribe = device(ENDPOINT);
    await endDevice(key);
    await checkDevice(null);
    return unsubscribe;
  }

  it("gets the device back with the same notices, and no press", async () => {
    allow("granted");
    const unsubscribe = await signedOut("k1", ["daily", "reminder"]);
    expect(unsubscribe).not.toHaveBeenCalled();
    await checkDevice("k1");
    expect(on.calls).toEqual([{ key: "k1", kinds: ["daily", "reminder"] }]);
    expect(unsubscribe).not.toHaveBeenCalled();
  });

  // "Turn all off" on another device removes this device from the account. It must stay off.
  it("ends the device when the account does not know it any more", async () => {
    allow("granted");
    const unsubscribe = await signedOut("k1", ["daily"]);
    on.restores = false;
    await checkDevice("k1");
    expect(on.calls).toHaveLength(1);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("ends the device for another reader, who gets nothing of it", async () => {
    allow("granted");
    const unsubscribe = await signedOut("k1", ["daily"]);
    await checkDevice("k2");
    expect(on.calls).toEqual([]);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it.each([["denied"], ["default"]])("ends the device when the permission of the browser is “%s”", async (permission) => {
    allow(permission);
    const unsubscribe = await signedOut("k1", ["daily"]);
    await checkDevice("k1");
    expect(on.calls).toEqual([]);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("does not come back for a reader who only has a record of notices, with no sign-out here", async () => {
    allow("granted");
    const unsubscribe = device(ENDPOINT);
    rememberDevice("k1", ["daily"]);
    await checkDevice("k1");
    expect(on.calls).toEqual([]);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
