import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { fetchLibrary, type LibraryWork, type RawPassageOthers, type RawPassagePapers } from "@/content/library";
import { dhammapadaPage2, dhammapadaPages } from "@/components/library/library-fixtures";
import { handlePassageParallels, shapePassageParallels, WORKS_FLOOR } from "./library-parallels";

let library: LibraryWork[] = [];
beforeAll(async () => {
  vi.stubGlobal("fetch", async (url: string) => new Response(readFileSync(`e2e/fixtures/library/${url.endsWith("/works") ? "works" : "scriptures"}.json`, "utf8")));
  library = await fetchLibrary("https://api.test");
  vi.unstubAllGlobals();
});
const work = (slug: string) => library.find((w) => w.slug === slug) as LibraryWork;

function papersOf(name: string): RawPassagePapers {
  const d = JSON.parse(readFileSync(`e2e/fixtures/library/urantia-parallels_${name}.json`, "utf8")).data;
  return { reference: d.reference, url: d.url, papers: d.urantiaParallels.map((u: { standardReferenceId: string; paperTitle: string; text: string; similarity: number }) => ({ reference: u.standardReferenceId, paperTitle: u.paperTitle, text: u.text, similarity: u.similarity })) };
}
const OTHERS: RawPassageOthers = {
  label: "Dhp 21-23",
  others: [
    { workId: "bible", workTitle: "The Bible (World English Bible)", reference: "Psalms 1:1-2", text: "Blessed is the man.", url: "https://ebible.org/eng-web/PSA01.htm#V1", similarity: 0.52 },
    { workId: "quran", workTitle: "The Meaning of the Glorious Koran", reference: "Quran 2.255-257", text: "Allah! There is no God save Him.", url: null, similarity: 0.5 },
    { workId: "rig-veda", workTitle: "The Hymns of the Rigveda", reference: "RV 10.129.1-2", text: "THEN was not non-existent.", url: null, similarity: 0.46 },
  ],
};

describe("the parallels of a passage of the Library", () => {
  it("lists the Papers at the floor of the work, the nearest first, each with its paragraph", () => {
    const answer = shapePassageParallels(papersOf("dhammapada_Dhp-21"), OTHERS, work("dhammapada"), library);
    expect(answer.papers[0]).toMatchObject({ ref: "131:3.7", work: "The Urantia Papers", source: "The World’s Religions", percent: 63, href: "/papers/paper-131-the-worlds-religions#131:3.7" });
    expect(answer.papers.every((p) => p.percent >= 40)).toBe(true);
    expect(answer.nearby).toEqual([]);
    expect(answer.label).toBe("Dhammapada 21-23");
  });

  it("names the translation of the passage and its source address, only on a site that it knows", () => {
    const answer = shapePassageParallels(papersOf("dhammapada_Dhp-21"), OTHERS, work("dhammapada"), library);
    expect(answer.source).toBe("Muller, 1881");
    expect(answer.href).toMatch(/^https:\/\/www\.gutenberg\.org\//);
    const elsewhere = shapePassageParallels({ ...papersOf("dhammapada_Dhp-21"), url: "https://evil.example/x" }, null, work("dhammapada"), library);
    expect(elsewhere.href).toBeNull();
  });

  it("holds a Rig Veda passage to the floor of the Rig Veda, and keeps the passages under it apart", () => {
    const answer = shapePassageParallels(papersOf("rig-veda_RV-10.129.1"), null, work("rig-veda"), library);
    expect(answer.papers.map((p) => p.ref)).toEqual(["105:1.5"]);
    expect(answer.weakerPapers.map((p) => p.ref)).toContain("131:8.2");
    expect(answer.label).toBe("Rig Veda 10.129.1");
  });

  it("lists the other works at their own floor, with short names, and nothing when they did not load", () => {
    expect(WORKS_FLOOR).toBe(0.47);
    const answer = shapePassageParallels(papersOf("dhammapada_Dhp-21"), OTHERS, work("dhammapada"), library);
    expect(answer.outside.map((p) => [p.ref, p.work, p.source, p.percent, p.library])).toEqual([
      ["Psalms 1:1-2", "Bible", "World English Bible", 52, { slug: "bible", ref: "Psalms 1:1-2" }],
      ["Quran 2.255-257", "Koran", "Pickthall, 1930", 50, { slug: "quran", ref: "Quran 2.255-257" }],
    ]);
    expect(answer.weaker.map((p) => p.ref)).toEqual(["Rig Veda 10.129.1-2"]);
    const none = shapePassageParallels(papersOf("dhammapada_Dhp-21"), null, work("dhammapada"), library);
    expect([none.outside, none.weaker]).toEqual([[], []]);
  });
});

describe("the parallels of a Bible verse", () => {
  const others = (): RawPassageOthers => {
    const d = JSON.parse(readFileSync("e2e/fixtures/library/work-parallels_bible_John-3.16.json", "utf8")).data;
    return { label: d.chunk.label, others: d.parallels.map((p: { work: { id: string; title: string }; reference: string; text: string; url: string | null; similarity: number }) => ({ workId: p.work.id, workTitle: p.work.title, reference: p.reference, text: p.text, url: p.url, similarity: p.similarity })) };
  };

  it("names the chunk and the translation, and lists the works near it with a way to read each here", () => {
    const answer = shapePassageParallels(papersOf("bible_John-3.16"), others(), work("bible"), library);
    expect(answer.label).toBe("John 3:10-21");
    expect(answer.source).toBe("World English Bible");
    expect(answer.href).toMatch(/^https:\/\/ebible\.org\//);
    expect(answer.papers.length).toBeGreaterThan(0);
    expect(answer.outside[0]).toMatchObject({ ref: "Helaman 8:14-15", percent: 55, library: { slug: "book-of-mormon", ref: "Helaman 8:14-15" } });
  });

  it("takes a verse of a book with brackets in its name, and asks the API by the book code", async () => {
    const papers = vi.fn(async () => papersOf("bible_John-3.16"));
    const otherWorks = vi.fn(async () => others());
    const res = await handlePassageParallels("bible", "Daniel (Greek) 3:5", {
      library: async () => library,
      pages: async () => [{ key: "daniel-greek-3", division: 46, subdivision: 3, title: null, firstRef: "Daniel (Greek) 3:1", lastRef: "Daniel (Greek) 3:1", count: 0, readRef: "DanGr 3", part: "Deuterocanon", book: { code: "DanGr", name: "Daniel (Greek)", title: "Daniel (Greek)" } }],
      page: async () => [{ ref: "Daniel (Greek) 3:5", number: "5", text: "x", url: null }],
      papers,
      others: otherWorks,
    });
    expect(res.status).toBe(200);
    // The API refuses "Daniel (Greek) 3:5", "Esther (Greek) 1:1", and "Psalm 151 1:3"; it takes the book code.
    expect(papers).toHaveBeenCalledWith("bible", "DanGr 3:5");
    expect(otherWorks).toHaveBeenCalledWith("bible", "DanGr 3:5");
  });
});

describe("handlePassageParallels", () => {
  const deps = (over: object = {}) => ({
    library: async () => library,
    pages: async () => dhammapadaPages(),
    page: async () => dhammapadaPage2(),
    papers: vi.fn(async () => papersOf("dhammapada_Dhp-21")),
    others: vi.fn(async () => OTHERS),
    ...over,
  });

  it("answers both halves, and lets a shared cache keep them", async () => {
    const res = await handlePassageParallels("dhammapada", "Dhp 21", deps());
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage");
    const body = await res.json();
    expect(body.papers[0].ref).toBe("131:3.7");
    expect(body.outside).toHaveLength(2);
  });

  it("refuses a work outside the Library and a reference of another form, before any load", async () => {
    const d = deps();
    for (const [slug, ref] of [["no-such-work", "John 3:16"], ["dhammapada", "Dhp<script>"], ["dhammapada", `Dhp ${"1".repeat(40)}`]]) {
      expect((await handlePassageParallels(slug, ref, d)).status).toBe(400);
    }
    expect(d.papers).not.toHaveBeenCalled();
  });

  it("answers 404 for a passage that its page does not hold, with no load of its parallels", async () => {
    const d = deps();
    expect((await handlePassageParallels("dhammapada", "Dhp 021", d)).status).toBe(404);
    expect((await handlePassageParallels("dhammapada", "Dhp 999", d)).status).toBe(404);
    expect(d.papers).not.toHaveBeenCalled();
  });

  it("stands with no other works when they fail, and answers 502 when the Papers fail", async () => {
    const res = await handlePassageParallels("dhammapada", "Dhp 21", deps({ others: async () => Promise.reject(new Error("down")) }));
    expect(res.status).toBe(200);
    expect((await res.json()).outside).toEqual([]);
    expect((await handlePassageParallels("dhammapada", "Dhp 21", deps({ papers: async () => Promise.reject(new Error("down")) }))).status).toBe(502);
  });
});
