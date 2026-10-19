import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { LibraryWork, WorkPage } from "@/content/library";
import { biblePages } from "./bible";
import { workContents, workFacts } from "./contents";

const pagesOf = (slug: string): WorkPage[] =>
  JSON.parse(readFileSync(`e2e/fixtures/library/scriptures_${slug}.json`, "utf8")).data.pages.map(
    (p: { division: number; subdivision: number | null; title: string | null; firstRef: string; lastRef: string; passageCount: number }) => ({
      key: p.subdivision === null ? String(p.division) : `${p.division}-${p.subdivision}`,
      division: p.division,
      subdivision: p.subdivision,
      title: p.title,
      firstRef: p.firstRef,
      lastRef: p.lastRef,
      count: p.passageCount,
    }),
  );
const bible = () => biblePages(JSON.parse(readFileSync("e2e/fixtures/library/bible_books.json", "utf8")).data);
const work = (slug: string, refLevels: 1 | 2 | 3, divisionLabel: string, unitLabel: string, units: number, refPrefix = "") =>
  ({ slug, title: slug, refLevels, divisionLabel, unitLabel, units, refPrefix }) as LibraryWork;

describe("workContents", () => {
  it("lists the chapters of the Dhammapada by title, each with its range of verses", () => {
    const contents = workContents(work("dhammapada", 1, "chapter", "verse", 414, "Dhp"), pagesOf("dhammapada"));
    expect(contents.kind).toBe("list");
    if (contents.kind !== "list") return;
    expect(contents.rows).toHaveLength(26);
    expect(contents.rows[0]).toEqual({ key: "1", number: "1", title: "The Twin-Verses", line: "Verses 1–20" });
    expect(contents.rows[1].line).toBe("Verses 21–32");
  });

  it("gives a count, not a range, where the numbers start again in each chapter", () => {
    const contents = workContents(work("bhagavad-gita", 2, "chapter", "verse", 701, "BG"), pagesOf("bhagavad-gita"));
    if (contents.kind !== "list") throw new Error(contents.kind);
    expect(contents.rows[0].line).toBe("47 verses");
  });

  it("gives the Tao Te Ching and the Quran a grid of numbers", () => {
    expect(workContents(work("tao-te-ching", 2, "chapter", "paragraph", 236, "TTC"), pagesOf("tao-te-ching"))).toMatchObject({ kind: "grid" });
    const quran = workContents(work("quran", 2, "surah", "verse", 6236, "Quran"), pagesOf("quran"));
    if (quran.kind !== "grid") throw new Error(quran.kind);
    expect(quran.rows).toHaveLength(114);
    expect(quran.rows[0]).toMatchObject({ key: "1", number: "1" });
  });

  it("gives the Bible its books in their parts, and a work in books its books with no part", () => {
    const b = workContents(work("bible", 2, "book", "verse", 38034), bible());
    if (b.kind !== "books") throw new Error(b.kind);
    expect(b.unit).toBe("chapter");
    expect(b.parts.map((p) => p.part)).toEqual(["Old Testament", "Deuterocanon", "New Testament"]);
    expect(b.parts[2].books.find((x) => x.name === "John")?.numbers).toHaveLength(21);
    const rv = workContents(work("rig-veda", 3, "book", "verse", 10505, "RV"), pagesOf("rig-veda"));
    if (rv.kind !== "books") throw new Error(rv.kind);
    expect(rv.unit).toBe("hymn");
    expect(rv.parts).toHaveLength(1);
    expect(rv.parts[0].books).toHaveLength(10);
  });

  it("gives a work of one page no list: its text is the page", () => {
    expect(workContents(work("japji", 1, "composition", "pauri", 40, "Japji"), pagesOf("japji"))).toEqual({ kind: "single" });
  });
});

describe("workFacts", () => {
  it("counts the parts and the units of a work", () => {
    const dhp = work("dhammapada", 1, "chapter", "verse", 414, "Dhp");
    expect(workFacts(dhp, workContents(dhp, pagesOf("dhammapada")))).toEqual(["26 chapters", "414 verses"]);
    const b = work("bible", 2, "book", "verse", 38034);
    expect(workFacts(b, workContents(b, bible()))).toEqual(["81 books", "38,034 verses"]);
  });

  it("leaves out the count of a unit that is a range (Hesiod's lines), and the parts of a work of one page", () => {
    const hesiod = work("hesiod", 2, "poem", "lines", 171, "Hesiod");
    expect(workFacts(hesiod, workContents(hesiod, pagesOf("hesiod")))).toEqual(["2 poems"]);
    const japji = work("japji", 1, "composition", "pauri", 40, "Japji");
    expect(workFacts(japji, { kind: "single" })).toEqual(["40 pauris"]);
  });
});
