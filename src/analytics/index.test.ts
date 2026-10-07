import { afterEach, describe, expect, it, vi } from "vitest";

const posthog = vi.hoisted(() => ({ init: vi.fn(), register: vi.fn(), capture: vi.fn() }));
vi.mock("posthog-js", () => ({ default: posthog }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  Object.values(posthog).forEach((fn) => fn.mockClear());
});

describe("analytics", () => {
  it("does nothing with no key", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    const { initAnalytics, track } = await import("./index");
    initAnalytics();
    track("paper_opened", { paper_id: "1" });
    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it("starts PostHog with no cookie and no browser storage", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { initAnalytics } = await import("./index");
    initAnalytics();
    expect(posthog.init).toHaveBeenCalledTimes(1);
    const [key, options] = posthog.init.mock.calls[0];
    expect(key).toBe("phc_test");
    expect(options).toMatchObject({
      api_host: "https://us.i.posthog.com",
      persistence: "memory",
      autocapture: false,
      disable_session_recording: true,
    });
  });

  it("puts the app label on every event", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { initAnalytics } = await import("./index");
    initAnalytics();
    expect(posthog.register).toHaveBeenCalledWith({ app: "hub-v2" });
  });

  it("sends an event with its properties after the start", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { initAnalytics, track } = await import("./index");
    initAnalytics();
    track("paper_opened", { paper_id: "1" });
    track("home_read_clicked");
    expect(posthog.capture).toHaveBeenNthCalledWith(1, "paper_opened", { paper_id: "1" });
    expect(posthog.capture).toHaveBeenNthCalledWith(2, "home_read_clicked", undefined);
  });

  it("starts only one time", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { initAnalytics } = await import("./index");
    initAnalytics();
    initAnalytics();
    expect(posthog.init).toHaveBeenCalledTimes(1);
  });
});
