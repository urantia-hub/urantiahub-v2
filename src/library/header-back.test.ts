import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { headerBack, SHORT_NAMES } from "./header-back";

describe("headerBack", () => {
  it("goes from a page of a work up to the work, by its short name", () => {
    expect(headerBack("/texts/dhammapada/2")).toEqual({ href: "/texts/dhammapada", label: "Dhammapada" });
    expect(headerBack("/texts/bible/john-3")).toEqual({ href: "/texts/bible", label: "Bible" });
  });

  it("goes from a work up to World texts", () => {
    expect(headerBack("/texts/tao-te-ching")).toEqual({ href: "/texts", label: "World texts" });
  });

  it("goes to World texts from a page of a work that it does not know, never to a wrong name", () => {
    expect(headerBack("/texts/new-work/1")).toEqual({ href: "/texts", label: "World texts" });
  });

  it("shows nothing on World texts itself, on a passage address, or on any other page", () => {
    for (const path of ["/texts", "/texts/", "/texts/quran/at/Quran%201.3", "/papers", "/", "/papers/paper-1-the-universal-father"]) expect(headerBack(path)).toBeNull();
  });

  it("has a short name for each work that the API lists", () => {
    const works: { id: string }[] = JSON.parse(readFileSync("e2e/fixtures/library/works.json", "utf8")).data;
    for (const w of works) expect(SHORT_NAMES[w.id], w.id).toBeTruthy();
  });
});
