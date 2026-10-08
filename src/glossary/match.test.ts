import { describe, expect, it } from "vitest";
import type { GlossaryEntry } from "./glossary";
import { createMatcher, termsIn } from "./match";

const entry = (name: string, type: GlossaryEntry["type"] = "being", aliases: string[] = []): GlossaryEntry => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  name,
  type,
  aliases,
  description: `About ${name}.`,
  seeAlso: [],
  citations: 1,
});
const names = (found: GlossaryEntry[]) => found.map((e) => e.name);

describe("createMatcher", () => {
  const match = createMatcher([
    entry("Universal Father"),
    entry("Father"),
    entry("Paradise", "place"),
    entry("mortals", "order"),
    entry("Son"),
    entry("Thought Adjuster", "being", ["Mystery Monitor"]),
    entry("personality", "concept"),
    entry("1-2-3 the First"),
    entry("A.B.C. the First"),
    entry("God (the Father)"),
    entry("church", "concept"),
  ]);

  it("finds each term in the order of the text", () => {
    expect(names(match("To Paradise go the mortals who know the Universal Father."))).toEqual(["Paradise", "mortals", "Universal Father"]);
  });

  // Review Focus 1.
  it("gives the longest name where two overlap, and never matches inside a word", () => {
    expect(names(match("The Universal Father loves."))).toEqual(["Universal Father"]);
    expect(names(match("A Father, and the Universal Father."))).toEqual(["Father", "Universal Father"]);
    expect(names(match("Each person has a reason. The Sonship is real."))).toEqual([]);
  });

  it("matches a name with a capital letter only with its capitals", () => {
    expect(names(match("a son and a father in paradise"))).toEqual([]);
    expect(names(match("The Son is in Paradise."))).toEqual(["Son", "Paradise"]);
  });

  it("matches a name in lower case in each case", () => {
    expect(names(match("Mortals rise. Their PERSONALITY grows."))).toEqual(["mortals", "personality"]);
  });

  it("matches a plain plural", () => {
    expect(names(match("The Thought Adjusters and the Sons and the churches."))).toEqual(["Thought Adjuster", "Son", "church"]);
  });

  it("matches another name of an entry", () => {
    expect(names(match("The Mystery Monitor waits."))).toEqual(["Thought Adjuster"]);
  });

  it("gives a term one time for a text", () => {
    expect(names(match("Paradise, Paradise, and the Isle of Paradise."))).toEqual(["Paradise"]);
  });

  // Review Focus 4.
  it("handles a name with digits, periods, and parentheses", () => {
    expect(names(match("Then 1-2-3 the First and A.B.C. the First spoke to God (the Father)."))).toEqual(["1-2-3 the First", "A.B.C. the First", "God (the Father)"]);
  });

  it("gives nothing for an empty text", () => {
    expect(match("")).toEqual([]);
  });

  it("ignores an entry with an empty name, and an empty other name", () => {
    const odd = createMatcher([entry(""), entry("Urantia", "place", ["", "  "])]);
    expect(names(odd("On Urantia, and elsewhere."))).toEqual(["Urantia"]);
  });
});

describe("termsIn, with the real glossary", () => {
  it("finds names and ideas in a sentence of the kind that the Papers hold", () => {
    const found = names(termsIn("The Universal Father lives on Paradise, and mortals of Urantia find him by faith."));
    for (const name of ["Universal Father", "Paradise", "mortals", "Urantia", "faith"]) expect(found).toContain(name);
  });
  it("takes less than a twentieth of a second for a long paragraph", () => {
    const text = "The Universal Father and the Eternal Son and the Infinite Spirit on Paradise. ".repeat(40);
    termsIn(text);
    const start = performance.now();
    termsIn(text);
    expect(performance.now() - start).toBeLessThan(50);
  });
});
