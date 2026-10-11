import { afterEach, describe, expect, it, vi } from "vitest";

const world = vi.hoisted(() => ({
  key: "k1" as string | null,
  state: "allowed" as string,
  push: { daily: true } as Record<string, boolean> | null,
  subscribed: { endpoint: "https://fcm.googleapis.com/fcm/send/abc", p256dh: "BKey_0123456789", auth: "auth_0123456789", label: "Chrome on Android" } as object | null,
  saves: true,
  puts: [] as unknown[],
  whileAsking: null as null | (() => void),
}));
vi.mock("@/account/client", () => ({ accountKey: () => world.key }));
vi.mock("@/account/reader-call", () => ({
  readerCall: vi.fn(async (_path: string, init?: RequestInit) => {
    if (!init?.method) return { settings: world.push ? { push: world.push } : null, devices: [] };
    world.puts.push(JSON.parse(String(init.body)));
    return world.saves ? { saved: true } : null;
  }),
}));
vi.mock("./push", () => ({
  deviceState: () => world.state,
  subscribeDevice: async () => {
    world.whileAsking?.();
    return world.subscribed;
  },
}));

import { DEVICE_EVENT, endDevice, registerDevice, syncDevice } from "./device-end";

const ENDPOINT = "https://fcm.googleapis.com/fcm/send/abc";
afterEach(() => {
  Object.assign(world, { key: "k1", state: "allowed", push: { daily: true }, saves: true, puts: [], whileAsking: null });
  world.subscribed = { endpoint: ENDPOINT, p256dh: "BKey_0123456789", auth: "auth_0123456789", label: "Chrome on Android" };
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "serviceWorker");
});

describe("this device joins the account", () => {
  it("with its address, its keys, and its name", async () => {
    expect(await registerDevice("k1")).toBe(true);
    expect(world.puts).toEqual([{ endpoint: ENDPOINT, p256dh: "BKey_0123456789", auth: "auth_0123456789", label: "Chrome on Android", kinds: [] }]);
  });

  it("does not join when the reader or the browser said no, or when the account did not take it", async () => {
    world.subscribed = null;
    expect(await registerDevice("k1")).toBe(false);
    expect(world.puts).toEqual([]);
    world.subscribed = { endpoint: ENDPOINT, p256dh: "p", auth: "a", label: "x" };
    world.saves = false;
    expect(await registerDevice("k1")).toBe(false);
  });

  // The question of the browser can stay open for a long time. The reader can sign out in it.
  it("does not join when the reader changed while the browser asked", async () => {
    world.whileAsking = () => void (world.key = "k2");
    expect(await registerDevice("k1")).toBe(false);
    expect(world.puts).toEqual([]);
  });
});

// Kelson, 2026-10-11: a reader who signs in again must not turn the push on again.
describe("a reader who signs in on a device", () => {
  const joined = () => {
    const seen = vi.fn();
    window.addEventListener(DEVICE_EVENT, seen, { once: true });
    return seen;
  };

  it("gets this device with no press, when the browser allows notices and a push is on", async () => {
    const seen = joined();
    await syncDevice("k1");
    expect(world.puts).toHaveLength(1);
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["the browser did not ask yet: no question comes by itself", () => void (world.state = "ask")],
    ["the browser blocks notices", () => void (world.state = "blocked")],
    ["the reader has no push on", () => void (world.push = { daily: false })],
    ["the reader has no settings", () => void (world.push = null)],
    ["the reader changed", () => void (world.key = "k2")],
  ])("adds nothing when %s", async (_case, arrange) => {
    arrange();
    await syncDevice("k1");
    expect(world.puts).toEqual([]);
  });

  it("adds nothing when nobody is signed in", async () => {
    await syncDevice(null);
    expect(world.puts).toEqual([]);
  });
});

describe("a sign-out", () => {
  function device(endpoint: string | null) {
    const unsubscribe = vi.fn();
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { getRegistration: async () => ({ pushManager: { getSubscription: async () => (endpoint ? { endpoint, unsubscribe } : null) } }) } });
    return unsubscribe;
  }

  it("makes the account forget this device, and keeps the registration of the browser", async () => {
    const fetch = vi.fn(async () => Response.json({ removed: true }));
    vi.stubGlobal("fetch", fetch);
    const unsubscribe = device(ENDPOINT);
    await endDevice("k1");
    const [path, init] = fetch.mock.calls[0] as unknown as [string, RequestInit & { headers: Record<string, string> }];
    expect(path).toBe("/api/me/notices/device");
    expect(init.method).toBe("DELETE");
    expect(JSON.parse(String(init.body))).toEqual({ endpoint: ENDPOINT });
    expect(init.headers["x-hub-reader"]).toBe("k1");
    // The same reader, signed in again, gets the same device back.
    expect(unsubscribe).not.toHaveBeenCalled();
  });

  it("never throws: with no answer, with no device, and with no reader", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    device(ENDPOINT);
    await endDevice("k1");
    device(null);
    await endDevice("k1");
    await endDevice(null);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
