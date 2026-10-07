import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("site", () => {
  it("defaults to localhost and not indexable", async () => {
    vi.stubEnv("SITE_ORIGIN", "");
    vi.stubEnv("SITE_INDEXABLE", "");
    const { site, absoluteUrl } = await import("./site");
    expect(site.origin).toBe("http://localhost:3000");
    expect(site.indexable).toBe(false);
    expect(absoluteUrl("/papers")).toBe("http://localhost:3000/papers");
  });

  it("reads the origin without a trailing slash and the index setting", async () => {
    vi.stubEnv("SITE_ORIGIN", "https://next.urantiahub.com/");
    vi.stubEnv("SITE_INDEXABLE", "on");
    const { site, absoluteUrl } = await import("./site");
    expect(site.origin).toBe("https://next.urantiahub.com");
    expect(site.indexable).toBe(true);
    expect(absoluteUrl("/")).toBe("https://next.urantiahub.com/");
  });

  it("treats any value other than on as not indexable", async () => {
    vi.stubEnv("SITE_INDEXABLE", "true");
    const { site } = await import("./site");
    expect(site.indexable).toBe(false);
  });
});
