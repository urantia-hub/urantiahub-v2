import { describe, expect, it } from "vitest";
import { isQuestion, MAX_QUERY, normalizeQuery, searchHref } from "./query";

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
