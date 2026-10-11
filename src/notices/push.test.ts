import { describe, expect, it } from "vitest";
import { deviceLabel, deviceState, unblockSteps } from "./push";

const CHROME_ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const CHROME_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const SAFARI_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const SAFARI_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
const FIREFOX = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0";
const base = { userAgent: CHROME_ANDROID, touchPoints: 5, standalone: false, hasPush: true, permission: "default" as const, key: "BKey" };

describe("what this browser can do with notices", () => {
  it("is nothing while the site has no key, on each browser", () => {
    expect(deviceState({ ...base, key: "", permission: "granted" })).toBe("none");
  });

  it("follows the answer that the reader gave the browser", () => {
    expect(deviceState(base)).toBe("ask");
    expect(deviceState({ ...base, permission: "granted" })).toBe("allowed");
    expect(deviceState({ ...base, permission: "denied" })).toBe("blocked");
  });

  it("is the home screen steps on an iPhone or iPad in the browser, and the usual states from the home screen", () => {
    expect(deviceState({ ...base, userAgent: SAFARI_IPHONE, hasPush: false, permission: null })).toBe("ios");
    expect(deviceState({ ...base, userAgent: SAFARI_MAC, touchPoints: 5, hasPush: false, permission: null })).toBe("ios");
    expect(deviceState({ ...base, userAgent: SAFARI_IPHONE, standalone: true })).toBe("ask");
    expect(deviceState({ ...base, userAgent: SAFARI_MAC, touchPoints: 0 })).toBe("ask");
  });

  it("is nothing in a browser with no push", () => {
    expect(deviceState({ ...base, hasPush: false })).toBe("none");
    expect(deviceState({ ...base, permission: null })).toBe("none");
  });
});

describe("the name of a device", () => {
  it("is the browser and the system, and never the full text", () => {
    expect(deviceLabel(CHROME_ANDROID)).toBe("Chrome on Android");
    expect(deviceLabel(CHROME_MAC)).toBe("Chrome on Mac");
    expect(deviceLabel(SAFARI_IPHONE)).toBe("Safari on iPhone");
    expect(deviceLabel(SAFARI_MAC, 5)).toBe("Safari on iPad");
    expect(deviceLabel(FIREFOX)).toBe("Firefox on Windows");
    expect(deviceLabel("something else")).toBe("A browser");
  });
});

describe("the steps to remove a block", () => {
  it("are for the browser of the reader", () => {
    expect(unblockSteps(CHROME_MAC)[1]).toContain("Notifications");
    expect(unblockSteps(FIREFOX)[1]).toContain("Blocked");
    expect(unblockSteps(SAFARI_MAC)[0]).toContain("Safari");
  });
});
