import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkDevice, claimDevice, endDevice, OWNER_CACHE, OWNER_PATH } from "./device-end";

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
  const current = endpoint ? { endpoint, unsubscribe } : null;
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { getRegistration: async () => ({ pushManager: { getSubscription: async () => current } }) } });
  return unsubscribe;
}
const ENDPOINT = "https://fcm.googleapis.com/fcm/send/abc";
const calls = () => vi.mocked(fetch).mock.calls.map(([path, init]) => ({ path, method: init?.method, body: JSON.parse(String(init?.body)), reader: (init?.headers as Record<string, string>)["x-hub-reader"] }));

let kept: Map<string, string>;
beforeEach(() => {
  kept = storage();
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}")));
});
afterEach(() => {
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

describe("a sign-out", () => {
  it("removes the mark first, tells the account, then ends the device in the browser", async () => {
    await claimDevice("k1");
    const order: string[] = [];
    vi.mocked(fetch).mockImplementation(async () => {
      order.push(kept.has(OWNER_PATH) ? "told with mark" : "told");
      return new Response("{}");
    });
    const unsubscribe = device(ENDPOINT, vi.fn(async () => (order.push("ended"), true)));
    await endDevice("k1");
    expect(order).toEqual(["told", "ended"]);
    expect(calls()).toEqual([{ path: "/api/me/notices/device", method: "DELETE", body: { endpoint: ENDPOINT }, reader: "k1" }]);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("ends the device in the browser also when the account does not answer", async () => {
    vi.mocked(fetch).mockImplementation(async () => Promise.reject(new Error("offline")));
    const unsubscribe = device(ENDPOINT);
    await endDevice("k1");
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  // The worker shows a notice only with the mark. So a browser that fails to end the device is still safe.
  it("leaves no mark when the browser fails to end the device", async () => {
    await claimDevice("k1");
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

  it("ends the device when no reader is signed in, when it is another reader, and when it is not known whose it is", async () => {
    for (const [claimed, now] of [["k1", null], ["k1", "k2"], [null, "k1"]] as const) {
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

  it("does nothing more on a device that gets no notices, or in a browser with no worker", async () => {
    device(null);
    await checkDevice("k1");
    Reflect.deleteProperty(navigator, "serviceWorker");
    await checkDevice(null);
    expect(fetch).not.toHaveBeenCalled();
  });
});
