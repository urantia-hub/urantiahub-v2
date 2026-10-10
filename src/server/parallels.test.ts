import { describe, expect, it, vi } from "vitest";
import { ContentError, ParagraphNotFound } from "@/content/fetchers";
import type { RawParallels } from "@/content/parallels";
import { handleParallels, OUTSIDE_FLOOR, type ParallelsAnswer, shapeParallels, WEAK_FLOOR } from "./parallels";

const corpus = (id: string, refPrefix: string, translator: string, year: number) => ({ id, refPrefix, title: id, translator, year });
const GITA = corpus("bhagavad-gita-besant-1922", "BG", "Annie Besant (4th edition)", 1922);
const RAW: RawParallels = {
  bible: [
    { reference: "Tobit 13:4", text: "Declare his greatness.", similarity: 0.42, url: "https://ebible.org/eng-web/TOB13.htm#V4" },
    { reference: "Sirach 18:1", text: "He who lives forever.", similarity: 0.39, url: "https://ebible.org/eng-web/SIR18.htm#V1" },
  ],
  scripture: [
    { reference: "BG 7.22-24", text: "He endowed with that faith.", similarity: 0.46, url: "https://en.wikisource.org/wiki/Bhagavad-Gita_(Besant_4th)/Discourse_7#:~:text=He", corpus: GITA },
    { reference: "DL 6.37", text: "A child has beaten me.", similarity: 0.23, url: "https://en.wikisource.org/wiki/Lives_of_the_Eminent_Philosophers/Book_VI", corpus: corpus("diogenes-laertius-6-hicks-1925", "DL", "R. D. Hicks", 1925) },
    { reference: "Quran 12.39-40", text: "Are divers lords better?", similarity: 0.4, url: "https://www.gutenberg.org/cache/epub/16955/pg16955-images.html#:~:text=Are", corpus: corpus("koran-pickthall-1930", "Quran", "Marmaduke Pickthall", 1930) },
  ],
  papers: [
    { reference: "1:0.1", paperId: "1", paperTitle: "The Universal Father", text: "THE Universal Father is the God of all creation.", similarity: 0.72 },
    { reference: "56:9.10", paperId: "56", paperTitle: "Universal Unity", text: "And God the Father is the personal source.", similarity: 0.73 },
    { reference: "900:1.1", paperId: "900", paperTitle: "No such paper", text: "x", similarity: 0.9 },
    // A reference that is not of its paper, one that is not in the form of a reference, and a weak one.
    { reference: "2:1.1", paperId: "1", paperTitle: "The Universal Father", text: "x", similarity: 0.9 },
    { reference: "1:1.1#x", paperId: "1", paperTitle: "The Universal Father", text: "x", similarity: 0.9 },
    { reference: "1:2.2", paperId: "1", paperTitle: "The Universal Father", text: "x", similarity: 0.49 },
  ],
};

describe("the parallels of a paragraph, as the reader sees them", () => {
  it("puts the other works in one list, the nearest first, and hides each passage below the floor", () => {
    const { outside } = shapeParallels(RAW);
    expect(OUTSIDE_FLOOR).toBe(0.4);
    expect(outside.map((p) => [p.ref, p.percent])).toEqual([
      ["Bhagavad Gita 7.22-24", 46],
      ["Tobit 13:4", 42],
      ["Quran 12.39-40", 40],
    ]);
  });

  // A reader who finds no near passage can ask for these. Far below the floor a passage shares nothing.
  it("keeps the nearest passages below the floor apart, down to a second floor, five at most", () => {
    const { weaker } = shapeParallels(RAW);
    expect(WEAK_FLOOR).toBe(0.3);
    expect(weaker.map((p) => [p.ref, p.percent])).toEqual([["Sirach 18:1", 39]]);
    const many = shapeParallels({ ...RAW, bible: Array.from({ length: 8 }, (_, i) => ({ reference: `Job 1:${i + 1}`, text: "x", similarity: 0.31 + i / 100, url: null })) });
    expect(many.weaker.map((p) => p.percent)).toEqual([38, 37, 36, 35, 34]);
  });

  it("names each work in a short form, with the translator and the year", () => {
    const { outside } = shapeParallels(RAW);
    expect(outside.map((p) => p.source)).toEqual(["Besant, 1922", "World English Bible", "Pickthall, 1930"]);
    // The name of the work, for the filter of the study page.
    expect(outside.map((p) => p.work)).toEqual(["Bhagavad Gita", "Bible", "Koran"]);
    expect(shapeParallels(RAW).papers.every((p) => p.work === "The Urantia Papers")).toBe(true);
  });

  it("writes a readable name for a short prefix", () => {
    const one = (reference: string, c: ReturnType<typeof corpus>) => shapeParallels({ bible: [], papers: [], scripture: [{ reference, text: "x", similarity: 0.9, url: null, corpus: c }] }).outside[0].ref;
    expect(one("DL 6.37", corpus("diogenes-laertius-6-hicks-1925", "DL", "R. D. Hicks", 1925))).toBe("Diogenes Laertius 6.37");
    expect(one("TTC 44", corpus("tao-te-ching-legge-1891", "TTC", "James Legge", 1891))).toBe("Tao Te Ching 44");
    expect(one("Dhp 21", corpus("dhammapada-muller-1881", "Dhp", "F. Max Muller", 1881))).toBe("Dhammapada 21");
    expect(one("Oracle 5", corpus("shinto-oracles-aston-1905", "Oracle", "W. G. Aston", 1905))).toBe("Shinto oracle 5");
    // A work that this code does not know keeps its own reference.
    expect(one("Avesta 3.1", corpus("avesta-x", "Avesta", "L. H. Mills", 1887))).toBe("Avesta 3.1");
  });

  it("gives each passage the address of its page, and only an address of a site that it knows", () => {
    const { outside } = shapeParallels(RAW);
    expect(outside[0].href).toBe("https://en.wikisource.org/wiki/Bhagavad-Gita_(Besant_4th)/Discourse_7#:~:text=He");
    expect(outside[1].href).toBe("https://ebible.org/eng-web/TOB13.htm#V4");
    const odd = (url: string | null) => shapeParallels({ bible: [{ reference: "John 1:1", text: "x", similarity: 0.9, url }], scripture: [], papers: [] }).outside[0].href;
    expect(odd("https://evil.example/JHN01.htm")).toBeNull();
    expect(odd("javascript:alert(1)")).toBeNull();
    expect(odd("http://ebible.org/eng-web/JHN01.htm")).toBeNull();
    expect(odd("https://ebible.org.evil.example/x")).toBeNull();
    expect(odd(null)).toBeNull();
    // A form that a browser reads as a path of this site, and an address with a port or a name in it.
    expect(odd("https:ebible.org/x")).toBeNull();
    expect(odd("https:/ebible.org/x")).toBeNull();
    expect(odd("https://ebible.org:8443/x")).toBeNull();
    expect(odd("https://u:p@ebible.org/x")).toBeNull();
    expect(odd("https://ebible.org@evil.example/")).toBeNull();
  });

  it("lists the passages of the Papers, the nearest first, each with its paper and the way to its paragraph", () => {
    const { papers } = shapeParallels(RAW);
    expect(papers).toEqual([
      { ref: "56:9.10", work: "The Urantia Papers", source: "Universal Unity", text: "And God the Father is the personal source.", percent: 73, href: "/papers/paper-56-universal-unity#56:9.10" },
      { ref: "1:0.1", work: "The Urantia Papers", source: "The Universal Father", text: "THE Universal Father is the God of all creation.", percent: 72, href: "/papers/paper-1-the-universal-father#1:0.1" },
    ]);
  });
});

describe("handleParallels", () => {
  const load = vi.fn(async (ref: string): Promise<RawParallels> => {
    if (ref === "1:0.9") throw new ParagraphNotFound(ref);
    if (ref === "1:0.8") throw new ContentError("down");
    return RAW;
  });

  it("answers the two lists, and lets a shared cache keep them", async () => {
    const res = await handleParallels("1:0.3", load);
    expect(res.status).toBe(200);
    const body = (await res.json()) as ParallelsAnswer;
    expect(body.outside).toHaveLength(3);
    expect(body.papers).toHaveLength(2);
    expect(res.headers.get("cache-control")).toContain("s-maxage=86400");
  });

  it.each(["1:0", "x", "197:0.1", "001:0.1", "1:0.3/../2", "1:0.3 "])("refuses %j before any work", async (ref) => {
    load.mockClear();
    const res = await handleParallels(ref, load);
    expect(res.status).toBe(400);
    expect(load).not.toHaveBeenCalled();
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("answers 404 for a paragraph that the paper does not hold, and 502 when the text service fails", async () => {
    expect((await handleParallels("1:0.9", load)).status).toBe(404);
    expect((await handleParallels("1:0.8", load)).status).toBe(502);
  });
});
