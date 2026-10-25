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

describe("pageMetadata in two languages", () => {
  it("names the locale of the page", async () => {
    const { pageMetadata } = await load("");
    expect(pageMetadata({ title: "x", description: "x", path: "/papers" }).openGraph).toMatchObject({ locale: "en_US" });
    expect(pageMetadata({ title: "x", description: "x", path: "/es", lang: "es" }).openGraph).toMatchObject({ locale: "es_LA" });
  });
  it("names no image on a Spanish page, so the Spanish image file gives it", async () => {
    const { pageMetadata, SHARE_IMAGE } = await load("");
    const es = pageMetadata({ title: "x", description: "x", path: "/es/buscar", lang: "es" });
    expect(es.openGraph).not.toHaveProperty("images");
    expect(es.twitter).not.toHaveProperty("images");
    expect(pageMetadata({ title: "x", description: "x", path: "/search" }).openGraph).toMatchObject({ images: [SHARE_IMAGE] });
  });
  it("links the twin of a page only while Spanish is on", async () => {
    const { pageMetadata } = await load("");
    const input = { title: "x", description: "x", path: "/papers/foreword", twin: "/es/documentos/prologo" };
    expect(pageMetadata(input).alternates?.languages).toBeUndefined();
    vi.stubEnv("NEXT_PUBLIC_SPANISH", "on");
    expect(pageMetadata(input).alternates?.languages).toEqual({
      en: "https://next.urantiahub.com/papers/foreword",
      es: "https://next.urantiahub.com/es/documentos/prologo",
      "x-default": "https://next.urantiahub.com/papers/foreword",
    });
    const es = pageMetadata({ ...input, path: "/es/documentos/prologo", twin: "/papers/foreword", lang: "es" });
    expect(es.alternates?.languages).toEqual({
      en: "https://next.urantiahub.com/papers/foreword",
      es: "https://next.urantiahub.com/es/documentos/prologo",
      "x-default": "https://next.urantiahub.com/papers/foreword",
    });
  });
});

describe("paperJsonLd", () => {
  it("describes the paper as an article with a breadcrumb", async () => {
    const { paperJsonLd } = await load("");
    const [article, crumbs] = paperJsonLd(
      { id: "1", title: "The Universal Father", partId: "1", slug: "paper-1-the-universal-father", sections: 7, paragraphs: 70 },
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

describe("paperJsonLd in Spanish", () => {
  it("names the language and the Spanish address", async () => {
    const { paperJsonLd } = await load("");
    const [article] = paperJsonLd(
      { id: "0", title: "Prólogo", partId: "0", slug: "prologo", sections: 12, paragraphs: 172 },
      "x",
      "es",
    ) as Record<string, unknown>[];
    expect(article).toMatchObject({ inLanguage: "es", url: "https://next.urantiahub.com/es/documentos/prologo" });
  });

  it("names the paper, the book, and the way to it in Spanish", async () => {
    const { paperJsonLd } = await load("");
    const [article, crumbs] = paperJsonLd(
      { id: "1", title: "El Padre Universal", partId: "1", slug: "documento-1-el-padre-universal", sections: 7, paragraphs: 70 },
      "x",
      "es",
    ) as Record<string, unknown>[];
    expect(article).toMatchObject({
      headline: "Documento 1: El Padre Universal",
      isPartOf: { "@type": "Book", name: "Los Documentos de Urantia", url: "https://next.urantiahub.com/es/documentos" },
    });
    expect(crumbs.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "UrantiaHub", item: "https://next.urantiahub.com/es" },
      { "@type": "ListItem", position: 2, name: "Documentos", item: "https://next.urantiahub.com/es/documentos" },
      { "@type": "ListItem", position: 3, name: "Documento 1: El Padre Universal", item: "https://next.urantiahub.com/es/documentos/documento-1-el-padre-universal" },
    ]);
  });

  it("keeps the English object as it is", async () => {
    const { paperJsonLd } = await load("");
    const out = paperJsonLd({ id: "1", title: "The Universal Father", partId: "1", slug: "paper-1-the-universal-father", sections: 7, paragraphs: 70 }, "d");
    expect(out).toEqual([
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "Paper 1: The Universal Father",
        description: "d",
        url: "https://next.urantiahub.com/papers/paper-1-the-universal-father",
        mainEntityOfPage: "https://next.urantiahub.com/papers/paper-1-the-universal-father",
        inLanguage: "en",
        isPartOf: { "@type": "Book", name: "The Urantia Papers", url: "https://next.urantiahub.com/papers" },
        publisher: { "@type": "Organization", name: "UrantiaHub", url: "https://next.urantiahub.com/" },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "UrantiaHub", item: "https://next.urantiahub.com/" },
          { "@type": "ListItem", position: 2, name: "Papers", item: "https://next.urantiahub.com/papers" },
          { "@type": "ListItem", position: 3, name: "Paper 1: The Universal Father", item: "https://next.urantiahub.com/papers/paper-1-the-universal-father" },
        ],
      },
    ]);
  });

  it("names the foreword by its title alone", async () => {
    const { paperHeadline } = await load("");
    expect(paperHeadline({ id: "0", title: "Prólogo" }, "es")).toBe("Prólogo");
    expect(paperHeadline({ id: "5", title: "La relación de Dios con el individuo" }, "es")).toBe("Documento 5: La relación de Dios con el individuo");
  });
});

// A pair of hreflang links counts only when each page names the other.
describe("the contents pages in two languages", () => {
  it("names each other while Spanish is on", async () => {
    vi.stubEnv("SITE_ORIGIN", "https://www.urantiahub.com");
    vi.stubEnv("NEXT_PUBLIC_SPANISH", "on");
    const en = (await import("@/app/(en)/papers/page")).metadata;
    const es = (await import("@/app/(es)/es/documentos/page")).generateMetadata();
    expect(en.alternates?.languages).toEqual(es.alternates?.languages);
    expect(en.alternates?.languages).toMatchObject({ es: "https://www.urantiahub.com/es/documentos" });
  });
});

describe("the home pages in two languages", () => {
  it("name each other while Spanish is on", async () => {
    vi.stubEnv("SITE_ORIGIN", "https://www.urantiahub.com");
    vi.stubEnv("NEXT_PUBLIC_SPANISH", "on");
    const en = (await import("@/app/(en)/page")).metadata;
    const es = (await import("@/app/(es)/es/page")).generateMetadata();
    expect(en.alternates?.languages).toEqual(es.alternates?.languages);
    expect(en.alternates?.languages).toMatchObject({ en: "https://www.urantiahub.com/", es: "https://www.urantiahub.com/es" });
  });
});
