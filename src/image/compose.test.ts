import { describe, expect, it } from "vitest";
import { chosenText, fit, sentences, wrap } from "./compose";

const TEXT = "The enlightened worlds all recognize the Father. The will creatures have embarked upon the journey; it is long. “Be you perfect, even as I am perfect.” In love the messengers carry it.";
// A measure that needs no canvas: each character is half of the type size wide.
const measure = (text: string, size: number) => text.length * size * 0.5;

describe("the sentences of a paragraph", () => {
  it("are cut after a full stop, a question mark, or an exclamation mark, with a closing quote kept", () => {
    expect(sentences(TEXT)).toEqual([
      "The enlightened worlds all recognize the Father.",
      "The will creatures have embarked upon the journey; it is long.",
      "“Be you perfect, even as I am perfect.”",
      "In love the messengers carry it.",
    ]);
  });

  it("do not stop at a number with a point or at a short form", () => {
    expect(sentences("1. The Gospel by Mark. John Mark wrote it in A.D. 68. It is short.")).toEqual(["1. The Gospel by Mark.", "John Mark wrote it in A.D. 68.", "It is short."]);
  });

  it("are one sentence for a text with no end mark, and none for an empty text", () => {
    expect(sentences("Create in me a clean heart, O Lord")).toEqual(["Create in me a clean heart, O Lord"]);
    expect(sentences("  ")).toEqual([]);
  });
});

describe("the text of the image", () => {
  const all = sentences(TEXT);
  it("is the chosen sentences in the order of the paragraph", () => {
    expect(chosenText(all, new Set([0, 1, 2, 3]))).toBe(TEXT);
  });
  it("marks each part that the reader left out", () => {
    expect(chosenText(all, new Set([0, 2]))).toBe("The enlightened worlds all recognize the Father. … “Be you perfect, even as I am perfect.” …");
    expect(chosenText(all, new Set([1]))).toBe("… The will creatures have embarked upon the journey; it is long. …");
  });
  it("is empty when no sentence is chosen", () => {
    expect(chosenText(all, new Set())).toBe("");
  });
});

describe("the lines of the image", () => {
  it("break between words at the width", () => {
    expect(wrap("aaaa bbbb cccc dddd", 20, 100, measure)).toEqual(["aaaa bbbb", "cccc dddd"]);
  });
  it("keep a word that is wider than the line on a line of its own", () => {
    expect(wrap("aa bbbbbbbbbbbbbbbbbbbb cc", 20, 100, measure)).toEqual(["aa", "bbbbbbbbbbbbbbbbbbbb", "cc"]);
  });
  it("use the largest type that fits the room, and say when no type fits", () => {
    const big = fit("aaaa bbbb", { width: 400, height: 300, sizes: [60, 40, 20], lineHeight: 1.5 }, measure);
    expect(big).toEqual({ size: 60, lines: ["aaaa bbbb"] });
    const small = fit("aaaa bbbb cccc dddd eeee ffff", { width: 200, height: 130, sizes: [60, 40, 20], lineHeight: 1.5 }, measure);
    expect(small?.size).toBe(20);
    expect(fit("word ".repeat(400).trim(), { width: 200, height: 130, sizes: [60, 40, 20], lineHeight: 1.5 }, measure)).toBeNull();
  });
});
