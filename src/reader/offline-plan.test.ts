import { describe, expect, it } from "vitest";
import { assetsOfPage, assetsOfStyle, inTurns, pagesToKeep } from "./offline-plan";

describe("the files of a page", () => {
  it("finds each script, style, and face one time, and no other address", () => {
    const html = '<link rel="stylesheet" href="/_next/static/chunks/a.css"/><link rel="preload" href="/_next/static/media/f.woff2" as="font"/><script src="/_next/static/chunks/b.js" async></script><script src="/_next/static/chunks/b.js"></script><a href="/papers">x</a><script src="https://other.example/x.js"></script>';
    expect(assetsOfPage(html)).toEqual(["/_next/static/chunks/a.css", "/_next/static/media/f.woff2", "/_next/static/chunks/b.js"]);
  });
});

describe("the files of a style sheet", () => {
  it("finds the faces, from the place of the sheet", () => {
    const css = '@font-face{src:url(../media/a.woff2) format("woff2")}@font-face{src:url("/_next/static/media/b.woff2")}.x{background:url(data:image/png;base64,AAAA)}.y{background:url(https://other.example/z.png)}';
    expect(assetsOfStyle(css, "/_next/static/chunks/a.css")).toEqual(["/_next/static/media/a.woff2", "/_next/static/media/b.woff2"]);
  });
});

describe("the pages to keep", () => {
  it("starts with the home page and the contents", () => {
    expect(pagesToKeep(["/papers/foreword"])).toEqual(["/", "/papers", "/papers/foreword"]);
  });
});

describe("a few at a time", () => {
  it("does each item, never more than the width at one time", async () => {
    let now = 0;
    let most = 0;
    const done: number[] = [];
    const ok = await inTurns([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      now += 1;
      most = Math.max(most, now);
      await new Promise((resolve) => setTimeout(resolve, 1));
      now -= 1;
      done.push(n);
    });
    expect(ok).toBe(true);
    expect(done.sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(most).toBe(3);
  });
  it("stops after a failure", async () => {
    const done: number[] = [];
    const ok = await inTurns([1, 2, 3, 4], 1, async (n) => {
      if (n === 2) throw new Error("no connection");
      done.push(n);
    });
    expect(ok).toBe(false);
    expect(done).toEqual([1]);
  });
});
