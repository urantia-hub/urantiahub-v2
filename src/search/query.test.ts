import { describe, expect, it } from "vitest";
import { hasWord, isQuestion, MAX_QUERY, normalizeQuery, queryKey, searchHref, startsLikeQuestion } from "./query";

describe("normalizeQuery", () => {
  it("trims and collapses spaces", () => {
    expect(normalizeQuery("  thought \n  adjuster ")).toBe("thought adjuster");
  });
  it("is empty for a missing value", () => {
    expect(normalizeQuery(undefined)).toBe("");
    expect(normalizeQuery("   ")).toBe("");
  });
  // Review Focus 4.
  it("takes the first value of a repeated parameter", () => {
    expect(normalizeQuery(["first", "second"])).toBe("first");
  });
  it("cuts a long text at the limit, with no space at the end", () => {
    const long = `${"a".repeat(MAX_QUERY - 1)} b c`;
    expect(normalizeQuery(long)).toBe("a".repeat(MAX_QUERY - 1));
    expect(normalizeQuery("x".repeat(5000))).toHaveLength(MAX_QUERY);
  });
});

describe("isQuestion", () => {
  it.each(["what happens after death", "Why do good people suffer?", "peace?", "is there life on other worlds", "how the world began long ago"])(
    "is true for %s",
    (q) => expect(isQuestion(q)).toBe(true),
  );
  it.each(["thought adjuster", "nature", "whatever", "island of paradise", "issue"])("is false for %s", (q) =>
    expect(isQuestion(q)).toBe(false),
  );
  it("is true for five words or more", () => {
    expect(isQuestion("the seven adjutant mind spirits")).toBe(true);
  });
});

describe("searchHref", () => {
  it("encodes the text", () => {
    expect(searchHref("why? & how")).toBe("/search?q=why%3F%20%26%20how");
  });
});

describe("faults that the branch review found", () => {
  it("never cuts a character in half, so the address can always be built", () => {
    const q = normalizeQuery(`${"god ".repeat(49)}abc😀😀`);
    expect(() => searchHref(q)).not.toThrow();
    expect(Array.from(q).length).toBeLessThanOrEqual(MAX_QUERY);
  });
  it("removes control characters and half characters", () => {
    expect(normalizeQuery("a\u0000b\u0001c\u007fd")).toBe("a b c d");
    expect(() => searchHref(normalizeQuery("bad \ud83d half"))).not.toThrow();
    expect(normalizeQuery("bad \ud83d half")).toBe("bad half");
  });
  it("has a key form with no regard to case", () => {
    expect(queryKey("Thought  Adjuster")).toBe("thought adjuster");
  });
  it("knows a text with no letter or number, which the API refuses", () => {
    expect(hasWord("???")).toBe(false);
    expect(hasWord("…")).toBe(false);
    expect(hasWord("愛")).toBe(false);
    expect(hasWord("soul?")).toBe(true);
  });
  it("tells a question by its first word or its mark, with no regard to length", () => {
    expect(startsLikeQuestion("the bestowals of christ michael")).toBe(false);
    expect(startsLikeQuestion("is there life")).toBe(true);
    expect(startsLikeQuestion("peace?")).toBe(true);
  });
});
