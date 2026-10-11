import { afterEach, describe, expect, it, vi } from "vitest";

const world = vi.hoisted(() => ({
  key: "k1" as string | null,
  devices: [] as { id: string; label: string; kinds: string[]; endpointHash: string }[],
  puts: [] as { kinds: string[] }[],
  endpoint: "https://fcm.googleapis.com/fcm/send/abc" as string | null,
  remembered: [] as [string, string[]][],
}));
vi.mock("@/account/client", () => ({ accountKey: () => world.key }));
vi.mock("@/account/reader-call", () => ({
  readerCall: vi.fn(async (_path: string, init?: RequestInit) => {
    if (!init?.method) return { settings: {}, devices: world.devices };
    world.puts.push(JSON.parse(String(init.body)));
    return { saved: true };
  }),
}));
vi.mock("./push", () => ({
  sha256Hex: async (value: string) => `hash-of-${value}`,
  subscribeDevice: async () => (world.endpoint ? { endpoint: world.endpoint, p256dh: "BKey_0123456789", auth: "auth_0123456789", label: "Chrome on Android" } : null),
  unsubscribeDevice: async () => {},
}));
vi.mock("./device-end", () => ({ claimDevice: async () => true, endDevice: async () => {}, rememberDevice: (owner: string, kinds: string[]) => void world.remembered.push([owner, kinds]) }));

import { restoreDevice } from "./device-on";

const HASH = "hash-of-https://fcm.googleapis.com/fcm/send/abc";
const browserHas = (endpoint: string | null) =>
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { getRegistration: async () => ({ pushManager: { getSubscription: async () => (endpoint ? { endpoint } : null) } }) } });

afterEach(() => {
  Object.assign(world, { key: "k1", devices: [], puts: [], endpoint: "https://fcm.googleapis.com/fcm/send/abc", remembered: [] });
  Reflect.deleteProperty(navigator, "serviceWorker");
});

describe("a device that comes back after a new sign-in", () => {
  it("gets its notices again when the account still has it, with no notice", async () => {
    browserHas(world.endpoint);
    world.devices = [{ id: "a", label: "Chrome on Android", kinds: [], endpointHash: HASH }];
    expect(await restoreDevice("k1", ["daily", "reminder", "weekly"])).toBe(true);
    expect(world.puts).toEqual([expect.objectContaining({ endpoint: world.endpoint, kinds: ["daily", "reminder"] })]);
  });

  // "Turn all off", on this device or on another one, removes the device from the account.
  it.each([
    ["the account does not have the device", []],
    ["the account has another device only", [{ id: "b", label: "x", kinds: [], endpointHash: "hash-of-another" }]],
    ["the account has it with notices: that is not what a sign-out leaves", [{ id: "a", label: "x", kinds: ["daily"], endpointHash: HASH }]],
  ])("turns nothing on when %s", async (_case, devices) => {
    browserHas(world.endpoint);
    world.devices = devices;
    expect(await restoreDevice("k1", ["daily"])).toBe(false);
    expect(world.puts).toEqual([]);
  });

  it("turns nothing on when the browser has no device, when the reader changed, or when no notice is known", async () => {
    world.devices = [{ id: "a", label: "x", kinds: [], endpointHash: HASH }];
    browserHas(null);
    expect(await restoreDevice("k1", ["daily"])).toBe(false);
    browserHas(world.endpoint);
    world.key = "k2";
    expect(await restoreDevice("k1", ["daily"])).toBe(false);
    world.key = "k1";
    expect(await restoreDevice("k1", ["weekly"])).toBe(false);
    expect(world.puts).toEqual([]);
  });
});
