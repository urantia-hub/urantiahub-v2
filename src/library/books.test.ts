import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { LibraryWork, WorkPage } from "@/content/library";
import { GROUPED, NUMBERED, workBooks } from "./books";

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
const work = (slug: string, refPrefix: string, divisionLabel: string) => ({ slug, refPrefix, divisionLabel }) as LibraryWork;

describe("the books of a work in books", () => {
  it("names each book of the Book of Mormon by its references, Ether the 14th", () => {
    const books = workBooks(work("book-of-mormon", "BoM", "book"), pagesOf("book-of-mormon"));
    expect(books.map((b) => b.name)).toEqual(["1 Nephi", "2 Nephi", "Jacob", "Enos", "Jarom", "Omni", "Words of Mormon", "Mosiah", "Alma", "Helaman", "3 Nephi", "4 Nephi", "Mormon", "Ether", "Moroni"]);
    expect(books[13]).toEqual({ code: "14", name: "Ether", title: "", part: "", base: "14-", numbers: Array.from({ length: 15 }, (_, i) => i + 1) });
  });

  it("names a book of the Rig Veda by its number, and keeps the numbers of the hymns that are there", () => {
    const books = workBooks(work("rig-veda", "RV", "book"), pagesOf("rig-veda"));
    expect(books).toHaveLength(10);
    expect(books[9]).toMatchObject({ code: "10", name: "Book 10", base: "10-" });
    expect(books.reduce((n, b) => n + b.numbers.length, 0)).toBe(1027);
    const gaps = books.find((b) => b.numbers.some((n, i) => n !== i + 1));
    expect(gaps).toBeDefined();
  });

  it("names the parts of the Prose Edda", () => {
    expect(workBooks(work("prose-edda", "Prose Edda", "part"), pagesOf("prose-edda")).map((b) => [b.name, b.numbers.length])).toEqual([
      ["Prologue", 5],
      ["Gylfaginning", 54],
      ["Skáldskaparmál", 74],
    ]);
  });

  it("lists the works that read by books, with the word for their pages", () => {
    expect(GROUPED).toEqual({ "book-of-mormon": "chapter", "rig-veda": "hymn", "prose-edda": "chapter" });
  });
});

describe("the works that list their pages as numbers", () => {
  it("are the ones whose pages have no title", () => {
    expect([...NUMBERED]).toEqual(["quran", "tao-te-ching"]);
  });
});
