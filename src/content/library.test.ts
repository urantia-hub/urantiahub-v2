import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContentError } from "./fetchers";
import { fetchLibrary, fetchWorkPage, fetchWorkPages, type LibraryWork } from "./library";

const FIXTURES: Record<string, string> = {
  "/works": "works",
  "/scriptures": "scriptures",
  "/scriptures/dhammapada": "scriptures_dhammapada",
  "/scriptures/rig-veda": "scriptures_rig-veda",
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
  it("gives the 21 works with no Bible, each with its facts from both lists", async () => {
    serve();
    const works = await fetchLibrary(BASE);
    expect(works).toHaveLength(21);
    expect(works.some((w) => w.slug === "bible")).toBe(false);
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

  it("reads a page of a work with three levels by its hymn", async () => {
    serve();
    const rv = (await fetchLibrary(BASE)).find((w) => w.slug === "rig-veda") as LibraryWork;
    const page = (await fetchWorkPages(BASE, "rig-veda")).find((p) => p.key === "10-129");
    const passages = await fetchWorkPage(BASE, rv, page as never);
    expect(passages.map((p) => p.number)).toEqual(["10.129.1", "10.129.2", "10.129.3", "10.129.4", "10.129.5", "10.129.6", "10.129.7"]);
  });
});
