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

  // Found by the commit scan: PostHog records each address, and a search address holds the typed text.
  it("cuts the typed text of a search from each address before an event leaves the browser", async () => {
    const { scrubSearchText } = await import("./index");
    const event = {
      properties: {
        $current_url: "https://next.urantiahub.com/search?q=why%20am%20i%20afraid&all=exact",
        $referrer: "https://next.urantiahub.com/search?q=my+private+question",
        $pathname: "/search",
        $prev_pageview_pathname: "/papers/paper-1-the-universal-father",
        count: 3,
      },
      $set: { $current_url: "https://next.urantiahub.com/search?q=secret" },
      $set_once: { $initial_current_url: "https://next.urantiahub.com/search?q=secret#top" },
    };
    const out = scrubSearchText(event);
    expect(out.properties.$current_url).toBe("https://next.urantiahub.com/search");
    expect(out.properties.$referrer).toBe("https://next.urantiahub.com/search");
    expect(out.properties.$prev_pageview_pathname).toBe("/papers/paper-1-the-universal-father");
    expect(out.properties.count).toBe(3);
    expect(out.$set.$current_url).toBe("https://next.urantiahub.com/search");
    expect(out.$set_once.$initial_current_url).toBe("https://next.urantiahub.com/search#top");
    expect(JSON.stringify(out)).not.toMatch(/afraid|private|secret/);
    expect(scrubSearchText(null)).toBeNull();
  });

  it("gives PostHog that rule at the start", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { initAnalytics } = await import("./index");
    initAnalytics();
    await started();
    const options = posthog.init.mock.calls[0][1] as { before_send: (event: unknown) => unknown };
    const sent = options.before_send({ properties: { $current_url: "https://x.test/search?q=hidden" } }) as { properties: { $current_url: string } };
    expect(sent.properties.$current_url).toBe("https://x.test/search");
  });

  it("cuts the search text at each depth, from keys too, and in an encoded address", async () => {
    const { scrubSearchText } = await import("./index");
    const out = scrubSearchText({
      properties: {
        nested: { url: "https://x.test/search?q=deep+secret", list: ["/search?q=in%20a%20list"] },
        $heatmap_data: { "https://x.test/search?q=key+secret": [{ x: 1 }] },
        $referrer: "https://other.test/go?to=https%3A%2F%2Fx.test%2Fsearch%3Fq%3Dencoded%2520secret&x=1",
      },
    });
    expect(JSON.stringify(out)).not.toMatch(/secret|in%20a%20list/);
    expect(out.properties.nested).toEqual({ url: "https://x.test/search", list: ["/search"] });
    expect(Object.keys(out.properties.$heatmap_data as object)).toEqual(["https://x.test/search"]);
  });

  it("turns heatmaps off, because a heatmap uses the page address as a key", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { initAnalytics } = await import("./index");
    initAnalytics();
    await started();
    expect(posthog.init.mock.calls[0][1]).toMatchObject({ capture_heatmaps: false });
  });
});
