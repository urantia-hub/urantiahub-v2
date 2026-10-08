import { afterEach, describe, expect, it, vi } from "vitest";

const posthog = vi.hoisted(() => ({ init: vi.fn(), register: vi.fn(), capture: vi.fn() }));
vi.mock("posthog-js", () => ({ default: posthog }));
// The real idle wait has its own test. Here a zero timer keeps the "not in the same task" rule.
vi.mock("@/lib/when-idle", () => ({ whenIdle: (work: () => void) => setTimeout(work, 0) }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  Object.values(posthog).forEach((fn) => fn.mockClear());
});

// PostHog loads after the page is idle, so a test waits for the start.
const started = () => vi.waitFor(() => expect(posthog.init).toHaveBeenCalledTimes(1));

describe("analytics", () => {
  it("does nothing with no key", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    const { initAnalytics, track } = await import("./index");
    initAnalytics();
    track("paper_opened", { paper_id: "1" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it("does not load PostHog in the same task as the page start", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { initAnalytics } = await import("./index");
    initAnalytics();
    expect(posthog.init).not.toHaveBeenCalled();
    await started();
  });

  it("starts PostHog with no cookie and no browser storage", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { initAnalytics } = await import("./index");
    initAnalytics();
    await started();
    const [key, options] = posthog.init.mock.calls[0];
    expect(key).toBe("phc_test");
    expect(options).toMatchObject({
      api_host: "https://us.i.posthog.com",
      persistence: "memory",
      autocapture: false,
      disable_session_recording: true,
      // No feature flags in step 1. This also stops a config request that the CSP does not permit.
      advanced_disable_flags: true,
    });
  });

  it("puts the app label on every event", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { initAnalytics } = await import("./index");
    initAnalytics();
    await started();
    expect(posthog.register).toHaveBeenCalledWith({ app: "hub-v2" });
  });

  it("keeps the events that arrive before PostHog loads, and sends them in order", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { initAnalytics, track } = await import("./index");
    initAnalytics();
    track("paper_opened", { paper_id: "1" });
    track("home_read_clicked");
    expect(posthog.capture).not.toHaveBeenCalled();
    await started();
    await vi.waitFor(() => expect(posthog.capture).toHaveBeenCalledTimes(2));
    expect(posthog.capture).toHaveBeenNthCalledWith(1, "paper_opened", { paper_id: "1" });
    expect(posthog.capture).toHaveBeenNthCalledWith(2, "home_read_clicked", undefined);
  });

  it("sends an event at once after PostHog loads", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { initAnalytics, track } = await import("./index");
    initAnalytics();
    await started();
    track("paragraph_shared", { ref: "1:0.1", method: "copy" });
    expect(posthog.capture).toHaveBeenCalledWith("paragraph_shared", { ref: "1:0.1", method: "copy" });
    // Two passages can come from one paragraph, so the event names the position in the list too.
    track("home_passage_shown", { ref: "99:1.1", position: 2 });
    expect(posthog.capture).toHaveBeenCalledWith("home_passage_shown", { ref: "99:1.1", position: 2 });
  });

  it("starts only one time", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { initAnalytics } = await import("./index");
    initAnalytics();
    initAnalytics();
    await started();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(posthog.init).toHaveBeenCalledTimes(1);
  });

  // A reader with a blocker never loads PostHog. The wait list must not grow for the whole visit.
  it("keeps no more than 50 events while it waits", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { initAnalytics, track } = await import("./index");
    initAnalytics();
    for (let i = 0; i < 60; i++) track("home_read_clicked");
    await started();
    await vi.waitFor(() => expect(posthog.capture).toHaveBeenCalled());
    expect(posthog.capture).toHaveBeenCalledTimes(50);
  });

  it("stays quiet when PostHog does not start, and sends nothing later", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    posthog.init.mockImplementationOnce(() => {
      throw new Error("blocked");
    });
    const { initAnalytics, track } = await import("./index");
    initAnalytics();
    track("home_read_clicked");
    await started();
    await new Promise((resolve) => setTimeout(resolve, 20));
    track("home_read_clicked");
    expect(posthog.capture).not.toHaveBeenCalled();
  });
});
