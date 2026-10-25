import { describe, expect, it, vi } from "vitest";
import { ContentError, ParagraphNotFound } from "@/content/fetchers";
import type { RawParallels } from "@/content/parallels";
import { WORKS } from "@/parallels-works";
import { handleParallels, NEARBY_PAPERS, OUTSIDE_FLOOR, type ParallelsAnswer, shapeParallels, shapeWorks, WEAK_FLOOR, WORK_FLOORS } from "./parallels";

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

describe("the works that the Hub compares", () => {
  const CORPORA = [
    { id: "koran-pickthall-1930", title: "The Meaning of the Glorious Koran", translator: "Marmaduke Pickthall", year: 1930, sourceUrl: "https://www.gutenberg.org/ebooks/16955" },
    { id: "bhagavad-gita-besant-1922", title: "The Bhagavad Gita", translator: "Annie Besant (4th edition)", year: 1922, sourceUrl: "https://evil.example/x" },
    { id: "a-new-text-2027", title: "A New Text", translator: "Ann Lee", year: 1900, sourceUrl: "https://en.wikisource.org/wiki/A_New_Text" },
  ];

  it("lists the Papers, the Bible, and each text of the API, with the short name, the translation, and the page of the source", () => {
    expect(shapeWorks(CORPORA)).toEqual([
      { work: "The Urantia Papers", source: "", href: "/papers" },
      { work: "Bible", source: "World English Bible", href: "https://ebible.org/eng-web/" },
      { work: "Koran", source: "Pickthall, 1930", href: "https://www.gutenberg.org/ebooks/16955" },
      // An address of a site that is not on the list is not a link.
      { work: "Bhagavad Gita", source: "Besant, 1922", href: null },
      // A text that the API got after this code has its own title.
      { work: "A New Text", source: "Lee, 1900", href: "https://en.wikisource.org/wiki/A_New_Text" },
    ]);
  });

  // The texts of the API on 2026-10-18: its id, its prefix, and its title.
  const LIVE = [
    ["diogenes-laertius-6-hicks-1925", "DL", "Lives of Eminent Philosophers, Book 6: The Cynics"],
    ["epictetus-3-22-oldfather-1928", "Epictetus", "Discourses 3.22: On the Calling of a Cynic"],
    ["dhammapada-muller-1881", "Dhp", "The Dhammapada"],
    ["bhagavad-gita-besant-1922", "BG", "The Bhagavad Gita"],
    ["shinto-oracles-aston-1905", "Oracle", "Shinto Oracles"],
    ["tao-te-ching-legge-1891", "TTC", "The Tao Te Ching"],
    ["analects-legge-1861", "Analects", "The Analects of Confucius"],
    ["koran-pickthall-1930", "Quran", "The Meaning of the Glorious Koran"],
    ["japji-macauliffe-1909", "Japji", "The Japji"],
    ["book-of-mormon-1830", "BoM", "The Book of Mormon"],
    ["rig-veda-griffith-1896", "RV", "The Hymns of the Rigveda"],
    ["book-of-the-dead-renouf-1904", "BD", "The Egyptian Book of the Dead"],
    ["hesiod-evelyn-white-1914", "Hesiod", "Hesiod: Theogony and Works and Days"],
    ["homeric-hymns-evelyn-white-1914", "HH", "The Homeric Hymns"],
    ["poetic-edda-bellows-1923", "Edda", "The Poetic Edda"],
    ["aztec-hymns-brinton-1890", "Aztec Hymn", "Rig Veda Americanus: Sacred Songs of the Ancient Mexicans"],
    ["chuang-tzu-giles-1889", "Zhuangzi", "Chuang Tzu: Mystic, Moralist, and Social Reformer"],
    ["prose-edda-brodeur-1916", "Prose Edda", "The Prose Edda"],
    ["kojiki-chamberlain-1882", "Kojiki", "Kojiki: Records of Ancient Matters"],
    ["upanishads-muller-1879", "Upanishad", "The Upanishads, Part 1"],
    ["shu-king-legge-1879", "Shu", "The Shû King (Book of Documents)"],
  ] as const;

  it("gives each text of the API a short name, and the list of names holds it", () => {
    const works = shapeWorks(LIVE.map(([id, , title]) => ({ id, title, translator: "A. B", year: 1900, sourceUrl: null })));
    for (const [i, [, , title]] of LIVE.entries()) {
      const name = works[i + 2].work;
      expect(name.length).toBeLessThanOrEqual(20);
      expect(name).not.toBe(title);
      expect(WORKS).toContain(name);
    }
    // The Aztec hymns are not the Rig Veda.
    expect(works.find((w) => w.work.includes("Aztec"))?.work).toBe("Aztec hymns");
  });

  it("gives a passage of a work in the Library its slug and its reference there", async () => {
    const load = vi.fn().mockResolvedValue(RAW);
    const withSlugs = CORPORA.map((c) => ({ ...c, slug: c.id === "bhagavad-gita-besant-1922" ? "bhagavad-gita" : null }));
    const answer = (await (await handleParallels("1:0.3", load, undefined, async () => withSlugs)).json()) as ParallelsAnswer;
    expect(answer.outside.find((p) => p.ref === "Bhagavad Gita 7.22-24")?.library).toEqual({ slug: "bhagavad-gita", ref: "BG 7.22-24" });
    // The Bible is always in World texts.
    expect(answer.outside.find((p) => p.ref === "Tobit 13:4")?.library).toEqual({ slug: "bible", ref: "Tobit 13:4" });
  });

  it("is in the answer, and the answer stands with the names only when the list did not load", async () => {
    const load = vi.fn().mockResolvedValue(RAW);
    const good = (await (await handleParallels("1:0.3", load, undefined, async () => CORPORA)).json()) as ParallelsAnswer;
    expect(good.works.map((w) => w.work)).toEqual(["The Urantia Papers", "Bible", "Koran", "Bhagavad Gita", "A New Text"]);
    const bad = await handleParallels("1:0.3", load, undefined, async () => Promise.reject(new Error("down")));
    expect(bad.status).toBe(200);
    const works = ((await bad.json()) as ParallelsAnswer).works;
    expect(works.map((w) => w.work)).toEqual([...WORKS]);
    expect(works.every((w) => w.href === null || w.work === "The Urantia Papers" || w.work === "Bible")).toBe(true);
  });
});

describe("the parallels of a paragraph, as the reader sees them", () => {
  it("gives each passage a work that is in the list of the study page", () => {
    const answer = shapeParallels(RAW);
    for (const p of [...answer.outside, ...answer.weaker, ...answer.papers, ...answer.nearby]) expect(WORKS).toContain(p.work);
  });

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

  // From 0.40 to 0.45 these two shared a word or the style of the Bible, not a meaning (2026-10-18).
  it("rounds a score down, so a passage under the floor never shows the number of the floor", () => {
    const bible = [0.399, 0.57, 0.6383].map((similarity, i) => ({ reference: `Job 1:${i + 1}`, text: "x", similarity, url: null }));
    const answer = shapeParallels({ ...RAW, bible, scripture: [] });
    expect(answer.outside.map((p) => [p.ref, p.percent])).toEqual([["Job 1:3", 63], ["Job 1:2", 57]]);
    expect(answer.weaker.map((p) => [p.ref, p.percent])).toContainEqual(["Job 1:1", 39]);
  });

  it("holds the Book of Mormon and the Rig Veda to a floor of their own, and keeps a passage under it apart", () => {
    const at = (id: string, prefix: string, reference: string, similarity: number) => ({ reference, text: "x", similarity, url: null, corpus: corpus(id, prefix, "T", 1900) });
    const answer = shapeParallels({
      bible: [],
      papers: [],
      scripture: [
        at("book-of-mormon-1830", "BoM", "Alma 13:18", 0.46),
        at("book-of-mormon-1830", "BoM", "Ether 9:11", 0.44),
        at("rig-veda-griffith-1896", "RV", "RV 10.82.3", 0.45),
        at("rig-veda-griffith-1896", "RV", "RV 1.164.1", 0.43),
        at("koran-pickthall-1930", "Quran", "Quran 12.39", 0.41),
      ],
    });
    expect(WORK_FLOORS).toEqual({ "book-of-mormon-1830": 0.45, "rig-veda-griffith-1896": 0.45 });
    expect(answer.outside.map((p) => p.ref)).toEqual(["Alma 13:18", "Rig Veda 10.82.3", "Quran 12.39"]);
    expect(answer.weaker.map((p) => p.ref)).toEqual(["Ether 9:11", "Rig Veda 1.164.1"]);
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
    expect(one("RV 10.129.1", corpus("rig-veda-griffith-1896", "RV", "Ralph T. H. Griffith", 1896))).toBe("Rig Veda 10.129.1");
    expect(one("BD 125.3", corpus("book-of-the-dead-renouf-1904", "BD", "Peter Le Page Renouf and Édouard Naville", 1904))).toBe("Book of the Dead 125.3");
    expect(one("HH 2.59-73", corpus("homeric-hymns-evelyn-white-1914", "HH", "Hugh G. Evelyn-White", 1914))).toBe("Homeric Hymn 2.59-73");
    expect(one("Aztec Hymn 19.3", corpus("aztec-hymns-brinton-1890", "Aztec Hymn", "Daniel G. Brinton", 1890))).toBe("Aztec hymn 19.3");
    expect(one("Zhuangzi 4.16", corpus("chuang-tzu-giles-1889", "Zhuangzi", "Herbert A. Giles", 1889))).toBe("Chuang Tzu 4.16");
    expect(one("Shu 5.14.2", corpus("shu-king-legge-1879", "Shu", "James Legge", 1879))).toBe("Shu King 5.14.2");
    // A reference by a name of its part stays as it is.
    expect(one("Theogony 404-452", corpus("hesiod-evelyn-white-1914", "Hesiod", "Hugh G. Evelyn-White", 1914))).toBe("Theogony 404-452");
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

  // A reader is near those papers already: the passages of other parts of the Papers come first.
  it("puts a passage of the same paper, or of a paper at most two away, in a list of its own", () => {
    expect(NEARBY_PAPERS).toBe(2);
    const at = (paperId: string, similarity: number) => ({ reference: `${paperId}:1.1`, paperId, paperTitle: "x", text: "x", similarity });
    const raw = { bible: [], scripture: [], papers: [at("50", 0.6), at("52", 0.9), at("53", 0.7), at("47", 0.8), at("48", 0.65)] };
    const { papers, nearby } = shapeParallels(raw, "", "50");
    expect(papers.map((p) => [p.ref, p.percent])).toEqual([["47:1.1", 80], ["53:1.1", 70]]);
    expect(nearby.map((p) => [p.ref, p.percent])).toEqual([["52:1.1", 90], ["48:1.1", 65], ["50:1.1", 60]]);
    // With no paper to measure from, each passage is in the first list.
    expect(shapeParallels(raw).nearby).toEqual([]);
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
    // The paragraph is in Paper 1, so the passage of Paper 1 is nearby, and the one of Paper 56 is not.
    expect(body.papers.map((p) => p.ref)).toEqual(["56:9.10"]);
    expect(body.nearby.map((p) => p.ref)).toEqual(["1:0.1"]);
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

describe("the pair of a paragraph and a passage", () => {
  const slugs = new Map([["bhagavad-gita-besant-1922", "bhagavad-gita"], ["koran-pickthall-1930", "quran"]]);
  it("is set for a near passage of a work in World texts, and for a verse of the Bible", () => {
    const { outside } = shapeParallels(RAW, "", "1", slugs, "1:0.3");
    expect(outside.find((p) => p.library?.slug === "bhagavad-gita")?.pairPath).toBe("/s/1.0.3/bhagavad-gita/7.22-24");
    expect(outside.find((p) => p.ref === "Tobit 13:4")?.pairPath).toBe("/s/1.0.3/bible/tobit.13.4");
  });
  it("is not set below the floor, nor for a passage with no page in World texts", () => {
    const { weaker, outside } = shapeParallels(RAW, "", "1", new Map([["bhagavad-gita-besant-1922", "bhagavad-gita"]]), "1:0.3");
    expect(weaker.every((p) => p.pairPath === undefined)).toBe(true);
    expect(outside.find((p) => p.ref.startsWith("Quran") || p.ref.startsWith("Koran"))?.pairPath).toBeUndefined();
  });
});

describe("the parallels in Spanish", () => {
  const RAW_ES: RawParallels = {
    ...RAW,
    papers: [{ reference: "56:9.10", paperId: "56", paperTitle: "La unidad universal", text: "Y Dios Padre es la fuente personal.", similarity: 0.73 }],
  };
  const slugs = new Map([["bhagavad-gita-besant-1922", "bhagavad-gita"]]);

  it("links a passage of the Papers to the Spanish paper, with its Spanish words", () => {
    const answer = shapeParallels(RAW_ES, "", "1", slugs, "1:0.3", "es");
    expect(answer.papers).toEqual([expect.objectContaining({ ref: "56:9.10", work: "Los Documentos de Urantia", source: "La unidad universal", text: "Y Dios Padre es la fuente personal." })]);
    expect(answer.papers[0].href).toMatch(/^\/es\/documentos\/documento-56-[a-z0-9-]+#56:9\.10$/);
  });

  it("marks each passage of the Bible and of another work as English, with the Spanish pair page of a near one", () => {
    const answer = shapeParallels(RAW_ES, "", "1", slugs, "1:0.3", "es");
    expect(answer.outside.length).toBeGreaterThan(0);
    for (const row of [...answer.outside, ...answer.weaker]) expect(row.english).toBe(true);
    for (const row of answer.outside.filter((r) => r.library)) expect(row.pairPath).toMatch(/^\/es\/s\/1\.0\.3\//);
    expect(answer.weaker.every((row) => row.pairPath === undefined)).toBe(true);
    // English keeps its rows as they were.
    const en = shapeParallels(RAW_ES, "", "1", slugs, "1:0.3");
    expect(en.outside.every((row) => row.english === undefined)).toBe(true);
    expect(en.outside.find((row) => row.library)?.pairPath).toBeDefined();
  });

  it("reads the Spanish parallels and the Spanish text", async () => {
    const load = vi.fn(async () => RAW_ES);
    const loadText = vi.fn(async () => "EL Padre Universal.");
    const res = await handleParallels("1:0.3", load, loadText, undefined, "es");
    expect(load).toHaveBeenCalledWith("1:0.3", "es");
    expect(loadText).toHaveBeenCalledWith("1", "1:0.3", "es");
    expect(((await res.json()) as ParallelsAnswer).text).toBe("EL Padre Universal.");
  });
});
