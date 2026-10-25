import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bibleBooks, biblePages, bookSlug } from "./bible";
import { pageOfRef } from "./refs";

const books = JSON.parse(readFileSync("e2e/fixtures/library/bible_books.json", "utf8")).data;
const pages = biblePages(books);

describe("the books of the Bible", () => {
  it("gives each book once, with its part, its address, and its count of chapters", () => {
    const books = bibleBooks(pages);
    expect(books).toHaveLength(81);
    expect(books.find((b) => b.code === "DanGr")).toEqual({ code: "DanGr", name: "Daniel (Greek)", title: expect.any(String), part: "Deuterocanon", base: "daniel-greek-", numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] });
    expect(books.map((b) => b.part).filter((p, i, all) => all.indexOf(p) === i)).toEqual(["Old Testament", "Deuterocanon", "New Testament"]);
  });

  it("keeps the English address of each book in Spanish, under the Spanish name", () => {
    const names = JSON.parse(readFileSync("e2e/fixtures/library/bible_books.es.json", "utf8")).data;
    const spanish = biblePages(books, names, "es");
    const rows = bibleBooks(spanish);
    expect(rows.find((b) => b.code === "John")).toMatchObject({ name: "Juan", base: "john-" });
    expect(rows.find((b) => b.code === "Gen")).toMatchObject({ name: "Génesis", base: "genesis-" });
    // Each address of the books sheet is a page of the Bible.
    const keys = new Set(spanish.map((p) => p.key));
    for (const b of rows) for (const n of b.numbers) expect(keys.has(`${b.base}${n}`), `${b.base}${n}`).toBe(true);
  });
});

describe("the pages of the Bible", () => {
  it("gives one page for each chapter, in the order of the books", () => {
    expect(pages).toHaveLength(1402);
    expect(pages[0]).toMatchObject({ key: "genesis-1", readRef: "Gen 1", firstRef: "Genesis 1:1", part: "Old Testament" });
    expect(pages.find((p) => p.key === "john-3")).toEqual({
      key: "john-3",
      division: 58,
      subdivision: 3,
      title: null,
      firstRef: "John 3:1",
      lastRef: "John 3:1",
      count: 0,
      readRef: "John 3",
      part: "New Testament",
      book: { code: "John", name: "John", title: "The Gospel According to John" },
    });
  });

  it("gives each book an address of plain words and numbers", () => {
    expect(bookSlug("Daniel (Greek)")).toBe("daniel-greek");
    expect(bookSlug("1 Corinthians")).toBe("1-corinthians");
    expect(bookSlug("Song of Solomon")).toBe("song-of-solomon");
    expect(pages.find((p) => p.key === "daniel-greek-3")).toMatchObject({ readRef: "DanGr 3", firstRef: "Daniel (Greek) 3:1", part: "Deuterocanon" });
  });

  it("finds the chapter of a verse, for book names with numbers and brackets", () => {
    expect(pageOfRef(2, pages, "John 3:16")?.key).toBe("john-3");
    expect(pageOfRef(2, pages, "Psalm 151 1:3")?.key).toBe("psalm-151-1");
    expect(pageOfRef(2, pages, "Daniel (Greek) 3:5-7")?.key).toBe("daniel-greek-3");
    expect(pageOfRef(2, pages, "1 John 2:1")?.key).toBe("1-john-2");
    expect(pageOfRef(2, pages, "Psalms 119:105")?.key).toBe("psalms-119");
  });
});
