import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function load(indexable: string) {
  vi.stubEnv("SITE_ORIGIN", "https://next.urantiahub.com");
  vi.stubEnv("SITE_INDEXABLE", indexable);
  const robots = (await import("@/app/robots")).default;
  const sitemap = (await import("@/app/sitemap")).default;
  return { robots, sitemap };
}

describe("robots", () => {
  it("blocks all when the site is not indexable", async () => {
    const { robots } = await load("");
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });
  it("permits all but the search results and the reader's own page, and names the sitemap, when the site is indexable", async () => {
    const { robots } = await load("on");
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: ["/search", "/es/buscar", "/saved", "/es/guardados", "/parallels", "/progress", "/notifications", "/es/avisos", "/you", "/es/tu"] },
      sitemap: "https://next.urantiahub.com/sitemap.xml",
    });
  });
});

describe("sitemap", () => {
  it("lists the seven fixed pages and the 197 papers", async () => {
    const { sitemap } = await load("on");
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).toHaveLength(204);
    expect(urls).toContain("https://next.urantiahub.com/");
    expect(urls).toContain("https://next.urantiahub.com/papers");
    expect(urls).toContain("https://next.urantiahub.com/about");
    expect(urls).toContain("https://next.urantiahub.com/resources");
    expect(urls).toContain("https://next.urantiahub.com/releases");
    expect(urls).not.toContain("https://next.urantiahub.com/progress");
    expect(urls).toContain("https://next.urantiahub.com/privacy");
    expect(urls).toContain("https://next.urantiahub.com/terms");
    expect(urls).toContain("https://next.urantiahub.com/papers/foreword");
    expect(urls).toContain("https://next.urantiahub.com/papers/paper-196-the-faith-of-jesus");
    expect(new Set(urls).size).toBe(204);
  });
});
