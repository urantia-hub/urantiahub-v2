import { afterEach, describe, expect, it, vi } from "vitest";
import { checkDevice, claimDevice, endDevice } from "./device-end";

function device(endpoint: string | null) {
  const unsubscribe = vi.fn(async () => true);
  const current = endpoint ? { endpoint, unsubscribe } : null;
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { getRegistration: async () => ({ pushManager: { getSubscription: async () => current } }) } });
  return unsubscribe;
}
const calls = () => vi.mocked(fetch).mock.calls.map(([path, init]) => ({ path, method: init?.method, body: JSON.parse(String(init?.body)), reader: (init?.headers as Record<string, string>)["x-hub-reader"] }));

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "serviceWorker");
});

describe("the end of this device as one that gets notices", () => {
  it("tells the account, then ends the device in the browser", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}")));
    const unsubscribe = device("https://fcm.googleapis.com/fcm/send/abc");
    await endDevice("reader-key");
    expect(calls()).toEqual([{ path: "/api/me/notices/device", method: "DELETE", body: { endpoint: "https://fcm.googleapis.com/fcm/send/abc" }, reader: "reader-key" }]);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("ends the device in the browser also when the account does not answer", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    const unsubscribe = device("https://fcm.googleapis.com/fcm/send/abc");
    await endDevice("reader-key");
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("keeps the device of the reader who is signed in", async () => {
    const unsubscribe = device("https://fcm.googleapis.com/fcm/send/abc");
    claimDevice("k1");
    await checkDevice("k1");
    expect(unsubscribe).not.toHaveBeenCalled();
  });

  it("ends the device when no reader is signed in, when it is another reader, and when it is not known whose it is", async () => {
    vi.stubGlobal("fetch", vi.fn());
    for (const [claimed, now] of [["k1", null], ["k1", "k2"], [null, "k1"]] as const) {
      localStorage.clear();
      const unsubscribe = device("https://fcm.googleapis.com/fcm/send/abc");
      if (claimed) claimDevice(claimed);
      await checkDevice(now);
      expect(unsubscribe).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem("hub.notices.owner")).toBeNull();
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does nothing on a device that gets no notices, or in a browser with no worker", async () => {
    vi.stubGlobal("fetch", vi.fn());
    device(null);
    await endDevice("reader-key");
    Reflect.deleteProperty(navigator, "serviceWorker");
    await endDevice("reader-key");
    expect(fetch).not.toHaveBeenCalled();
  });
});
