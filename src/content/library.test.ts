import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContentError } from "./fetchers";
import { fetchLibrary, fetchWorkPage, fetchWorkPages, fetchWorkPairs, type LibraryWork } from "./library";

const FIXTURES: Record<string, string> = {
  "/works": "works",
  "/scriptures": "scriptures",
  "/scriptures/dhammapada": "scriptures_dhammapada",
  "/bible/books": "bible_books",
  "/works/bible/John%203": "works_bible_John-3",
  "/scriptures/rig-veda": "scriptures_rig-veda",
  "/scriptures/insights/pairs?corpus=dhammapada&limit=3": "pairs_dhammapada",
  "/works/dhammapada/Dhp%2021-32": "works_dhammapada_Dhp-21-32",
  "/works/rig-veda/RV%2010.129": "works_rig-veda_RV-10.129",
};
const asked: string[] = [];
function serve(over: Record<string, unknown> = {}) {
  vi.stubGlobal("fetch", async (url: string) => {
    const path = url.replace("https://api.test", "");
    asked.push(path);
    if (path in over) return new Response(JSON.stringify(over[path]));
    const name = FIXTURES[path];
    return name ? new Response(readFileSync(`e2e/fixtures/library/${name}.json`, "utf8")) : new Response("{}", { status: 404 });
  });
}
afterEach(() => {
  vi.unstubAllGlobals();
  asked.length = 0;
});
const BASE = "https://api.test";

describe("fetchLibrary", () => {
  it("gives the Bible first and the 21 works, each with its facts and its byline", async () => {
    serve();
    const works = await fetchLibrary(BASE);
    expect(works).toHaveLength(22);
    expect(works[0]).toMatchObject({
      slug: "bible",
      corpusId: "bible",
      title: "The Bible (World English Bible)",
      tradition: "Jewish and Christian",
      kind: "scripture",
      translator: "World English Bible",
      year: null,
      byline: "World English Bible",
      refLevels: 2,
      unitLabel: "verse",
    });
    expect(works.find((w) => w.slug === "dhammapada")?.byline).toBe("F. Max Muller, 1881");
    // The count of units and the section of Paper 131 on the tradition, when there is one.
    expect(works.find((w) => w.slug === "dhammapada")).toMatchObject({ units: 414, urantiaSection: "131:3" });
    expect(works[0]).toMatchObject({ units: 38034, urantiaSection: null });
    // The page of the source copy. The API lists none for the Bible, so the Hub names eBible.org.
    expect(works[0].sourceUrl).toBe("https://ebible.org/find/details.php?id=eng-web");
    expect(works.find((w) => w.slug === "dhammapada")?.sourceUrl).toMatch(/^https:\/\/www\.gutenberg\.org\//);
    expect(works.find((w) => w.slug === "dhammapada")).toMatchObject({
      corpusId: "dhammapada-muller-1881",
      title: "The Dhammapada",
      tradition: "Buddhist",
      kind: "scripture",
      translator: "F. Max Muller",
      year: 1881,
      refPrefix: "Dhp",
      refLevels: 1,
      unitLabel: "verse",
    });
  });

  it("refuses an answer of an unknown shape", async () => {
    serve({ "/works": { data: [{ id: 3 }] } });
    await expect(fetchLibrary(BASE)).rejects.toBeInstanceOf(ContentError);
  });
});

describe("the pages of a work", () => {
  it("gives each page with its key", async () => {
    serve();
    const pages = await fetchWorkPages(BASE, "rig-veda");
    expect(pages).toHaveLength(1027);
    expect(pages[0]).toEqual({ key: "1-1", division: 1, subdivision: 1, title: "Agni", firstRef: "RV 1.1.1", lastRef: "RV 1.1.9", count: 9 });
  });

  it("reads a whole page, and refuses one with fewer passages than its count", async () => {
    serve();
    const library = await fetchLibrary(BASE);
    const dhp = library.find((w) => w.slug === "dhammapada") as LibraryWork;
    const page = (await fetchWorkPages(BASE, "dhammapada"))[1];
    const passages = await fetchWorkPage(BASE, dhp, page);
    expect(asked).toContain("/works/dhammapada/Dhp%2021-32");
    expect(passages).toHaveLength(12);
    expect(passages[0]).toMatchObject({ ref: "Dhp 21", number: "21" });
    expect(passages[0].text.length).toBeGreaterThan(20);
    await expect(fetchWorkPage(BASE, dhp, { ...page, count: 13 })).rejects.toBeInstanceOf(ContentError);
  });

  it("gives the chapters of the Bible from its books, and reads a chapter by its book code", async () => {
    serve();
    const bible = (await fetchLibrary(BASE))[0];
    const pages = await fetchWorkPages(BASE, "bible");
    expect(pages).toHaveLength(1402);
    const passages = await fetchWorkPage(BASE, bible, pages.find((p) => p.key === "john-3") as never);
    expect(asked).toContain("/works/bible/John%203");
    expect(passages).toHaveLength(36);
    expect(passages[15]).toMatchObject({ ref: "John 3:16", number: "16" });
  });

  it("reads a page of a work with three levels by its hymn", async () => {
    serve();
    const rv = (await fetchLibrary(BASE)).find((w) => w.slug === "rig-veda") as LibraryWork;
    const page = (await fetchWorkPages(BASE, "rig-veda")).find((p) => p.key === "10-129");
    const passages = await fetchWorkPage(BASE, rv, page as never);
    expect(passages.map((p) => p.number)).toEqual(["10.129.1", "10.129.2", "10.129.3", "10.129.4", "10.129.5", "10.129.6", "10.129.7"]);
  });
});

describe("fetchWorkPairs", () => {
  it("gives the passages of a work and the paragraphs of the Papers nearest to each other, as percents", async () => {
    serve();
    const pairs = await fetchWorkPairs(BASE, "dhammapada");
    expect(asked).toEqual(["/scriptures/insights/pairs?corpus=dhammapada&limit=3"]);
    expect(pairs).toHaveLength(3);
    expect(pairs[0]).toMatchObject({ ref: "Dhp 21-23", percent: 63, paragraph: { ref: "131:3.7", paperId: "131", paperTitle: "The World’s Religions" } });
    expect(pairs[0].text).toMatch(/^Earnestness is the path of immortality/);
    expect(pairs[0].paragraph.text).toMatch(/^“A righteous soul/);
  });

  it("throws a content error when the API fails or answers an unknown shape", async () => {
    serve({ "/scriptures/insights/pairs?corpus=dhammapada&limit=3": { data: [{ nothing: true }] } });
    await expect(fetchWorkPairs(BASE, "dhammapada")).rejects.toBeInstanceOf(ContentError);
    serve();
    await expect(fetchWorkPairs(BASE, "quran")).rejects.toBeInstanceOf(ContentError);
  });
});
