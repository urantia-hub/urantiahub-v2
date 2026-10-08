import { describe, expect, it } from "vitest";
import { directHits } from "./direct-hits";

describe("directHits", () => {
  it("gives one hit for a paragraph reference", () => {
    expect(directHits("99:1.1")).toEqual([
      {
        kind: "reference",
        href: "/papers/paper-99-the-social-problems-of-religion#99:1.1",
        title: "Go to 99:1.1",
        detail: "Paper 99 · The Social Problems of Religion",
      },
    ]);
  });
  it("gives one hit for a section, a paper number, and the word foreword", () => {
    expect(directHits("99:1")[0]).toMatchObject({ title: "Go to 99:1", href: "/papers/paper-99-the-social-problems-of-religion#99:1" });
    expect(directHits("2")[0]).toMatchObject({ title: "Go to Paper 2", href: "/papers/paper-2-the-nature-of-god", detail: "Paper 2 · The Nature of God" });
    expect(directHits("Foreword")[0]).toMatchObject({ title: "Go to the Foreword", href: "/papers/foreword", detail: "The Urantia Papers" });
  });
  it("gives the papers with the word in the title, four at most, in paper order", () => {
    const hits = directHits("nature");
    expect(hits[0]).toEqual({ kind: "paper", href: "/papers/paper-2-the-nature-of-god", title: "The Nature of God", detail: "Paper 2" });
    expect(hits.length).toBeLessThanOrEqual(4);
    expect(directHits("god").length).toBe(4);
  });
  it("needs each word, as the start of a title word", () => {
    expect(directHits("thought adjust").map((h) => h.title)).toEqual([
      "Origin and Nature of Thought Adjusters",
      "Mission and Ministry of Thought Adjusters",
      "Relation of Adjusters to Universe Creatures",
      "Relation of Adjusters to Individual Mortals",
    ].filter((t) => /thought/i.test(t)));
    // "ature" is in "Nature", but no title word starts with it.
    expect(directHits("ature")).toEqual([]);
  });
  // Review Focus 1.
  it("gives nothing for small words and for a question", () => {
    expect(directHits("the")).toEqual([]);
    expect(directHits("of the and")).toEqual([]);
    expect(directHits("is there life on other worlds")).toEqual([]);
    expect(directHits("what is the nature of god")).toEqual([]);
  });
  it("gives nothing for empty text and for a paper number that does not exist", () => {
    expect(directHits("")).toEqual([]);
    expect(directHits("197")).toEqual([]);
  });
});
