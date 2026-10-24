import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import titlesEs from "./section-titles.es.json";
import { BOOK, minutesOf, nextAfter, orderOf, sectionAt, sectionLabel, titlesOf, TOTAL_SECTIONS } from "./section-index";

describe("the section index", () => {
  it("holds each section of the book, in reading order", () => {
    expect(TOTAL_SECTIONS).toBe(1626);
    expect(BOOK[0]).toMatchObject({ paperId: "0", id: "0" });
    expect(BOOK.at(-1)?.paperId).toBe("196");
    expect(orderOf("1", "0")).toBeGreaterThan(orderOf("0", "12"));
  });

  it("finds a section and the one after it", () => {
    expect(sectionAt("3", "4")?.title).toBe("God’s Limitlessness");
    expect(sectionAt("3", "99")).toBeUndefined();
    expect(nextAfter("3", "4")).toMatchObject({ paperId: "3", id: "5", title: "The Father’s Supreme Rule" });
    expect(nextAfter("3", "6")).toMatchObject({ paperId: "4", id: "0" });
    const last = BOOK.at(-1)!;
    expect(nextAfter(last.paperId, last.id)).toBe(BOOK[0]);
  });

  it("shows the title of a section, then its paper, and never a number alone", () => {
    expect(sectionLabel(sectionAt("3", "4")!)).toEqual({ title: "God’s Limitlessness", paper: "The Attributes of God" });
    expect(sectionLabel(sectionAt("3", "0")!)).toEqual({ title: "The Attributes of God", paper: "The opening" });
  });

  it("gives the English title of each section of a paper, by its number", () => {
    expect(titlesOf("1")).toMatchObject({ "0": null, "1": "The Father’s Name" });
    expect(titlesOf("999")).toEqual({});
  });

  // The Spanish titles load in the browser, by the section number. Each section of the index has one.
  it("has a Spanish title for each section of the book, and none for section 0", () => {
    const papers = titlesEs.papers as Record<string, (string | null)[]>;
    for (const entry of BOOK) {
      const title = papers[entry.paperId]?.[Number(entry.id)];
      if (entry.id === "0") expect(title, `${entry.paperId}:0`).toBeNull();
      else expect(title, `${entry.paperId}:${entry.id}`).toEqual(expect.any(String));
    }
    expect(papers["1"][1]).toBe("El nombre del Padre");
  });

  it("counts minutes at 100 words a minute, at least one", () => {
    expect(minutesOf(450)).toBe(5);
    expect(minutesOf(401)).toBe(5);
    expect(minutesOf(12)).toBe(1);
  });

  it("stays out of the code of the browser", () => {
    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? files(path) : [path];
      });
    const clients = files("src").filter((path) => /\.tsx?$/.test(path) && readFileSync(path, "utf8").startsWith('"use client"'));
    for (const path of clients) expect(readFileSync(path, "utf8"), path).not.toMatch(/section-index/);
  });
});
