import { describe, expect, it } from "vitest";
import { anchorFor, idFromSlug, parseReference, slugify } from "./paper-url";

describe("slugify", () => {
  it("names the Foreword without a number", () => {
    expect(slugify("0", "Foreword")).toBe("foreword");
  });
  it("builds paper-{id}-{kebab-title}", () => {
    expect(slugify("1", "The Universal Father")).toBe("paper-1-the-universal-father");
  });
  it("removes apostrophes and keeps existing hyphens", () => {
    expect(slugify("4", "God’s Relation to the Universe")).toBe("paper-4-gods-relation-to-the-universe");
    expect(slugify("19", "The Co-ordinate Trinity-Origin Beings")).toBe("paper-19-the-co-ordinate-trinity-origin-beings");
  });
});

describe("idFromSlug", () => {
  it.each([
    ["foreword", "0"],
    ["paper-1-the-universal-father", "1"],
    ["paper-1", "1"],
    ["1", "1"],
    ["0", "0"],
    ["paper-196-the-faith-of-jesus", "196"],
    ["paper-1-an-old-title", "1"],
    ["Paper-1-The-Universal-Father", "1"],
    ["paper-007", "7"],
  ])("reads %s as paper %s", (slug, id) => {
    expect(idFromSlug(slug)).toBe(id);
  });
  it.each(["paper-197-x", "197", "papers", "paper-", "", "the-universal-father", "paper-1x", "1.5"])(
    "rejects %s",
    (slug) => {
      expect(idFromSlug(slug)).toBeNull();
    },
  );
});

describe("parseReference", () => {
  it("reads a paper", () => {
    expect(parseReference("99")).toEqual({ paperId: "99" });
  });
  it("reads a section", () => {
    expect(parseReference("99:1")).toEqual({ paperId: "99", sectionId: "1" });
  });
  it("reads a paragraph", () => {
    expect(parseReference("99:1.1")).toEqual({ paperId: "99", sectionId: "1", paragraphId: "1" });
  });
  it("reads the Foreword", () => {
    expect(parseReference("0:0.1")).toEqual({ paperId: "0", sectionId: "0", paragraphId: "1" });
  });
  // Review Focus 1: forms that a reader really types.
  it.each(["(99:1.1)", " 99 : 1 . 1 ", "Paper 99:1.1", "paper 99:1.1", "99:01.01"])("accepts %s", (input) => {
    expect(parseReference(input)).toEqual({ paperId: "99", sectionId: "1", paragraphId: "1" });
  });
  it.each(["197", "abc", "", "99:", "99:1.", "99.1.1", "99:1:1", "-1", "1e2"])("rejects %s", (input) => {
    expect(parseReference(input)).toBeNull();
  });
});

describe("anchorFor", () => {
  it("returns no anchor for a paper", () => {
    expect(anchorFor({ paperId: "99" })).toBe("");
  });
  it("returns the section anchor", () => {
    expect(anchorFor({ paperId: "99", sectionId: "1" })).toBe("#99:1");
  });
  it("returns the paragraph anchor", () => {
    expect(anchorFor({ paperId: "99", sectionId: "1", paragraphId: "1" })).toBe("#99:1.1");
  });
});
