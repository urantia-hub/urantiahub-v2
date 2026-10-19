import { describe, expect, it } from "vitest";
import { chapterRow, pageLabels, unitCount } from "./labels";

const work = (over: object) => ({ title: "The Dhammapada", refLevels: 1, divisionLabel: "chapter", ...over }) as never;
const page = (over: object) => ({ key: "2", division: 2, subdivision: null, title: null, firstRef: "", lastRef: "", count: 1, ...over }) as never;

describe("the eyebrow and the title of a page", () => {
  it("uses the titles of the pages when each page has its own", () => {
    const pages = [page({ title: "The Twin-Verses" }), page({ title: "On Earnestness" })];
    expect(pageLabels(work({}), pages[1], pages)).toEqual({ eyebrow: "The Dhammapada · Chapter 2", title: "On Earnestness" });
    const shu = [page({ key: "1-1", division: 1, subdivision: 1, title: "The Canon of Yâo", firstRef: "Shu 1.1.1" }), page({ key: "2-1", division: 2, subdivision: 1, title: "The Canon of Shun", firstRef: "Shu 2.1.1" })];
    expect(pageLabels(work({ title: "The Shû King", refLevels: 3, divisionLabel: "part" }), shu[1], shu)).toEqual({ eyebrow: "The Shû King · Part 2", title: "The Canon of Shun" });
  });

  it("names a page by its division when the pages have no titles of their own", () => {
    const pages = [page({ key: "1", division: 1 }), page({ key: "2", division: 2 })];
    expect(pageLabels(work({ title: "The Meaning of the Glorious Koran", refLevels: 2, divisionLabel: "surah" }), pages[1], pages)).toEqual({ eyebrow: "The Meaning of the Glorious Koran", title: "Surah 2" });
  });

  it("names a page of three levels by its reference, with the shared title above it", () => {
    const bom = [page({ key: "1-1", division: 1, subdivision: 1, title: "1 Nephi", firstRef: "1 Nephi 1:1" }), page({ key: "1-3", division: 1, subdivision: 3, title: "1 Nephi", firstRef: "1 Nephi 3:1" })];
    expect(pageLabels(work({ title: "The Book of Mormon", refLevels: 3, divisionLabel: "book" }), bom[1], bom)).toEqual({ eyebrow: "The Book of Mormon · 1 Nephi", title: "1 Nephi 3" });
    const rv = [page({ key: "1-1", division: 1, subdivision: 1, title: "Agni", firstRef: "RV 1.1.1" }), page({ key: "1-2", division: 1, subdivision: 2, firstRef: "RV 1.2.1" })];
    expect(pageLabels(work({ title: "The Hymns of the Rigveda", refLevels: 3, divisionLabel: "book" }), rv[0], rv)).toEqual({ eyebrow: "The Hymns of the Rigveda · Book 1", title: "RV 1.1" });
  });

  it("names a chapter of the Bible by its book and number, with its part of the Bible above", () => {
    const john = page({ key: "john-3", division: 58, subdivision: 3, firstRef: "John 3:1", lastRef: "John 3:1", count: 0, readRef: "John 3", part: "New Testament", book: { code: "John", name: "John", title: "The Gospel According to John" } });
    expect(pageLabels(work({ title: "The Bible (World English Bible)", refLevels: 2, divisionLabel: "book" }), john, [john])).toEqual({ eyebrow: "The Bible · New Testament", title: "John 3" });
  });

  it("drops a part in brackets from the title of the work", () => {
    const pages = [page({ title: "A" }), page({ title: "B" })];
    expect(pageLabels(work({ title: "The Bible (World English Bible)" }), pages[0], pages).eyebrow).toBe("The Bible · Chapter 2");
  });
});

describe("counts and rows", () => {
  it("counts the units of a page in the word of the work", () => {
    expect(unitCount(12, "verse")).toBe("12 verses");
    expect(unitCount(1, "verse")).toBe("1 verse");
    expect(unitCount(88, "lines")).toBe("88 lines");
  });

  it("gives a row of the chapters list a number only when its title is not the reference", () => {
    const pages = [page({ title: "The Twin-Verses", key: "1", division: 1 }), page({ title: "On Earnestness" })];
    expect(chapterRow(work({}), pages[1], pages)).toEqual({ number: "2", title: "On Earnestness" });
    const rv = [page({ key: "10-129", division: 10, subdivision: 129, firstRef: "RV 10.129.1" }), page({ key: "1-2", division: 1, subdivision: 2, firstRef: "RV 1.2.1" })];
    expect(chapterRow(work({ title: "The Hymns of the Rigveda", refLevels: 3, divisionLabel: "book" }), rv[0], rv)).toEqual({ number: null, title: "RV 10.129" });
  });
});
