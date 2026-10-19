import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isTextPage, TEXT_WORKS, textWork } from "./text-index";

describe("the world-text index", () => {
  it("holds each page of each work, with its words", () => {
    expect(TEXT_WORKS).toHaveLength(22);
    expect(TEXT_WORKS.reduce((n, work) => n + work.pages.length, 0)).toBe(3599);
    expect(TEXT_WORKS.every((work) => work.pages.every((page) => page.words > 0 && page.passages > 0))).toBe(true);
    expect(textWork("bible")?.pages).toHaveLength(1402);
  });

  it("names the page of a work read by books, not the book", () => {
    expect(textWork("rig-veda")?.unit).toBe("hymn");
    expect(textWork("book-of-mormon")?.unit).toBe("chapter");
    expect(textWork("dhammapada")?.unit).toBe("chapter");
  });

  it("knows each page by its work", () => {
    expect(isTextPage("bible", "john-3")).toBe(true);
    expect(isTextPage("bible", "john-99")).toBe(false);
    expect(isTextPage("no-such-work", "1")).toBe(false);
  });

  it("stays out of the code of the browser", () => {
    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? files(path) : [path];
      });
    const clients = files("src").filter((path) => /\.tsx?$/.test(path) && readFileSync(path, "utf8").startsWith('"use client"'));
    for (const path of clients) expect(readFileSync(path, "utf8"), path).not.toMatch(/text-index/);
  });
});
