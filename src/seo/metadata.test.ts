import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function load(indexable: string) {
  vi.stubEnv("SITE_ORIGIN", "https://next.urantiahub.com");
  vi.stubEnv("SITE_INDEXABLE", indexable);
  return import("./metadata");
}

describe("describe", () => {
  it("returns short text unchanged", async () => {
    const { describe: d } = await load("");
    expect(d("A short line.")).toBe("A short line.");
  });
  it("cuts long text at a word and adds an ellipsis", async () => {
    const { describe: d } = await load("");
    const out = d("word ".repeat(60).trim());
    expect(out.length).toBeLessThanOrEqual(156);
    expect(out.endsWith("word…")).toBe(true);
  });
  it("joins line breaks into single spaces", async () => {
    const { describe: d } = await load("");
    expect(d("one\n\n  two")).toBe("one two");
  });
});

describe("pageMetadata", () => {
  it("sets the canonical URL from the site origin", async () => {
    const { pageMetadata } = await load("");
    const meta = pageMetadata({ title: "Papers", description: "All papers.", path: "/papers" });
    expect(meta.alternates?.canonical).toBe("https://next.urantiahub.com/papers");
    expect(meta.openGraph).toMatchObject({ url: "https://next.urantiahub.com/papers", siteName: "UrantiaHub" });
    expect(meta.title).toBe("Papers");
  });
  // A link with no image shows as a bare line in a chat or on a social site.
  it("gives a page the image of the site, and leaves it out for a page with an image of its own", async () => {
    const { pageMetadata } = await load("");
    const plain = pageMetadata({ title: "Papers", description: "All papers.", path: "/papers" });
    expect(plain.openGraph?.images).toEqual([{ url: "/opengraph-image", width: 1200, height: 630, alt: "The Urantia Papers on UrantiaHub" }]);
    expect(plain.twitter?.images).toEqual(plain.openGraph?.images);
    const own = pageMetadata({ title: "Paper 1", description: "x", path: "/papers/paper-1", ownImage: true });
    expect(own.openGraph?.images).toBeUndefined();
    expect(own.twitter?.images).toBeUndefined();
  });
  it("supports a title that skips the site template", async () => {
    const { pageMetadata } = await load("");
    const meta = pageMetadata({ title: "The Urantia Papers", description: "x", path: "/", absoluteTitle: true });
    expect(meta.title).toEqual({ absolute: "The Urantia Papers" });
  });
});

describe("paperJsonLd", () => {
  it("describes the paper as an article with a breadcrumb", async () => {
    const { paperJsonLd } = await load("");
    const [article, crumbs] = paperJsonLd(
      { id: "1", title: "The Universal Father", partId: "1", slug: "paper-1-the-universal-father", sections: 7 },
      "A description.",
    ) as Record<string, unknown>[];
    expect(article).toMatchObject({
      "@type": "Article",
      headline: "Paper 1: The Universal Father",
      url: "https://next.urantiahub.com/papers/paper-1-the-universal-father",
      inLanguage: "en",
    });
    expect(crumbs["@type"]).toBe("BreadcrumbList");
    expect(JSON.stringify(crumbs)).toContain("https://next.urantiahub.com/papers");
  });
});
