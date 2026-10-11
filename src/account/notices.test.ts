// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { changeDevice, changeNotices, type NoticesGateway, parseNotices, readNotices, removeDevice } from "./notices";

const OFF = { daily: false, reminder: false, releases: false };
const device = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", p256dh: "BKey_0123456789", auth: "auth_0123456789", kinds: ["daily"], label: "Chrome on Android" };
function gateway(answer: unknown = { settings: null, devices: [] }): NoticesGateway & { calls: unknown[][] } {
  const calls: unknown[][] = [];
  return {
    calls,
    notices: vi.fn(async () => answer),
    saveNotices: vi.fn(async (_token, patch) => void calls.push(["settings", patch])),
    saveDevice: vi.fn(async (_token, given) => void calls.push(["device", given])),
    removeDevice: vi.fn(async (_token, which) => void calls.push(["remove", which])),
  };
}

describe("what the account says about the notices", () => {
  it("is all off, hour 7, and not asked for a reader with no settings", () => {
    expect(parseNotices({ settings: null, devices: [] })).toEqual({ settings: { email: OFF, hour: 7, zone: null, asked: false }, devices: [] });
    expect(parseNotices("x")).toEqual({ settings: { email: OFF, hour: 7, zone: null, asked: false }, devices: [] });
  });

  it("keeps the known fields of the settings and of each device", () => {
    const answer = {
      settings: { email: { daily: true, x: true }, hour: 21, zone: "Asia/Kolkata", asked: true, at: 5 },
      devices: [{ id: "a", label: "Chrome on Android", kinds: ["daily", "weekly"], endpointHash: "ff00", endpoint: "secret" }, { id: 1 }],
    };
    expect(parseNotices(answer)).toEqual({
      settings: { email: { ...OFF, daily: true }, hour: 21, zone: "Asia/Kolkata", asked: true },
      devices: [{ id: "a", label: "Chrome on Android", kinds: ["daily"], endpointHash: "ff00" }],
    });
  });

  it("is read from the account", async () => {
    expect((await readNotices(gateway(), "t")).devices).toEqual([]);
  });
});

describe("a change of the notices from the browser", () => {
  it("sends only the fields that are of the right form", async () => {
    const g = gateway();
    expect(await changeNotices(g, "t", { email: { daily: true, weekly: true, reminder: "yes" }, hour: 6, zone: "Europe/Berlin", asked: true, other: 1 })).toEqual({ saved: true });
    expect(g.calls).toEqual([["settings", { email: { daily: true }, hour: 6, zone: "Europe/Berlin", asked: true }]]);
  });

  it("sends nothing when no field is valid", async () => {
    const g = gateway();
    for (const value of [null, "x", {}, { hour: 24 }, { hour: 1.5 }, { zone: "" }, { zone: "x".repeat(65) }, { email: "all" }, { asked: false }]) {
      expect(await changeNotices(g, "t", value)).toEqual({ saved: false });
    }
    expect(g.calls).toEqual([]);
  });
});

describe("a device from the browser", () => {
  it("is saved with its address, its keys, its kinds, and a short label", async () => {
    const g = gateway();
    expect(await changeDevice(g, "t", { ...device, extra: 1 })).toEqual({ saved: true });
    expect(g.calls).toEqual([["device", device]]);
  });

  it("is not sent when a part is missing or of the wrong form", async () => {
    const g = gateway();
    for (const value of [null, { ...device, endpoint: "http://x" }, { ...device, endpoint: 5 }, { ...device, auth: "" }, { ...device, kinds: ["weekly"] }, { ...device, kinds: "daily" }, { ...device, label: "x".repeat(61) }]) {
      expect(await changeDevice(g, "t", value)).toEqual({ saved: false });
    }
    expect(g.calls).toEqual([]);
  });

  it("is removed by its address, or each device with `all`", async () => {
    const g = gateway();
    expect(await removeDevice(g, "t", { endpoint: device.endpoint })).toEqual({ removed: true });
    expect(await removeDevice(g, "t", { all: true })).toEqual({ removed: true });
    expect(await removeDevice(g, "t", { all: "yes" })).toEqual({ removed: false });
    expect(g.calls).toEqual([["remove", { endpoint: device.endpoint }], ["remove", { all: true }]]);
  });
});
