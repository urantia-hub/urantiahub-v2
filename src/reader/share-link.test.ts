import { describe, expect, it } from "vitest";
import { cutWords, parsePick, pickCode, refForLink, refFromLink, sentenceRanges, sharePath, sharedWords, sharedFromAddress } from "./share-link";

const set = (...n: number[]) => new Set(n);

describe("the reference in a link", () => {
  it("has dots only, so a chat app keeps the whole link", () => {
    expect(refForLink("2:5.10")).toBe("2.5.10");
    expect(refFromLink("2.5.10")).toBe("2:5.10");
  });
  it("reads the form with a colon too", () => {
    expect(refFromLink("2:5.10")).toBe("2:5.10");
  });
  it("drops a zero at the start of a number", () => {
    expect(refFromLink("002.05.010")).toBe("2:5.10");
  });
  it("refuses what is not a paragraph", () => {
    for (const bad of ["2.5", "2", "a.b.c", "2.5.10.1", "197.0.1", "", "2.5.10/3"]) expect(refFromLink(bad)).toBeNull();
  });
});

describe("the chosen sentences in a link", () => {
  it("is empty for none and for all: the link is for the whole paragraph", () => {
    expect(pickCode(set(), 5)).toBe("");
    expect(pickCode(set(0, 1, 2, 3, 4), 5)).toBe("");
  });
  it("counts from 1, joins neighbors with a hyphen, and separates runs with a dot", () => {
    expect(pickCode(set(2), 5)).toBe("3");
    expect(pickCode(set(3, 0, 2), 5)).toBe("1.3-4");
    expect(pickCode(set(0, 1, 2, 4), 5)).toBe("1-3.5");
  });
  it("reads its own codes back", () => {
    expect(parsePick("3", 5)).toEqual(set(2));
    expect(parsePick("1.3-4", 5)).toEqual(set(0, 2, 3));
  });
  it("refuses a sentence that the paragraph does not have, and each second form of one choice", () => {
    for (const bad of ["6", "0", "3.1", "1-2.3", "1.2", "4-3", "1-5", "1,3", "", "1.", "x", "1.3-4.", "01"]) expect(parsePick(bad, 5)).toBeNull();
  });
  it("makes the path", () => {
    expect(sharePath("2:5.10", set(), 5)).toBe("/s/2.5.10");
    expect(sharePath("2:5.10", set(0, 2, 3), 5)).toBe("/s/2.5.10/1.3-4");
  });
});

describe("the shared words", () => {
  const text = "One is here. Two is here. Three is here.";
  it("is the whole paragraph with no choice", () => {
    expect(sharedWords(text, set())).toBe(text);
  });
  it("shows a gap between two chosen sentences", () => {
    expect(sharedWords(text, set(0, 2))).toBe("One is here. … Three is here.");
  });
  it("cuts at a word and says that more follows", () => {
    expect(cutWords("One two three, four five", 15)).toBe("One two three …");
    expect(cutWords("Short.", 15)).toBe("Short.");
  });
});

describe("where each sentence is in the text of the page", () => {
  it("finds each sentence, with any white space between words", () => {
    const text = "One is\n here.  Two is here. Three.";
    expect(sentenceRanges(text).map(([a, b]) => text.slice(a, b))).toEqual(["One is\n here.", "Two is here.", "Three."]);
  });
});

describe("a paper address that a shared link opened", () => {
  it("gives the paragraph and the choice", () => {
    expect(sharedFromAddress("?s=1.3-4", "#2:5.10")).toEqual({ ref: "2:5.10", code: "1.3-4" });
    expect(sharedFromAddress("?s=3", "#2%3A5.10")).toEqual({ ref: "2:5.10", code: "3" });
  });
  it("is nothing with no choice, no paragraph, or a wrong form", () => {
    expect(sharedFromAddress("", "#2:5.10")).toBeNull();
    expect(sharedFromAddress("?s=3", "")).toBeNull();
    expect(sharedFromAddress("?s=abc", "#2:5.10")).toBeNull();
    expect(sharedFromAddress("?s=3", "#%E0")).toBeNull();
  });
});
