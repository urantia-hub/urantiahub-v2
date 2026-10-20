import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { chosenText, fit, sentences, units, unitsText, wrap } from "./compose";

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
  it("marks a part that the reader left out between two sentences", () => {
    expect(chosenText(all, new Set([0, 2, 3]))).toBe("The enlightened worlds all recognize the Father. … “Be you perfect, even as I am perfect.” In love the messengers carry it.");
  });
  // A quote that starts or stops in a paragraph needs no mark: "Deity. …" reads odd.
  it("has no mark before the first chosen sentence or after the last", () => {
    expect(chosenText(all, new Set([0, 2]))).toBe("The enlightened worlds all recognize the Father. … “Be you perfect, even as I am perfect.”");
    expect(chosenText(all, new Set([1]))).toBe("The will creatures have embarked upon the journey; it is long.");
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

// Recorded API text (works.read, Shu King, Legge 1879): one sentence of about 620 characters.
const SHU = "The duke said, 'Prince Shih, I have heard that aforetime, when Thang the Successful had received the appointment (to the throne), he had with him Î Yin, making (his virtue) like that of great Heaven; that Thâi Kiâ had (the same Î Yin), the Pâo-hăng; that Thâi-wû had Î Kih and Khăn Hû, through whom (his virtue) was made to affect God, and Wû Hsien who regulated the royal House; that Zû-yî had Wû Hsien's son; and that Wû-ting had Kan Phan. (These ministers) carried out (their principles), and displayed (their merit), preserving and regulating the dynasty of Yin, so that, while its ceremonies lasted, (those sovereigns), when deceased, were assessors to Heaven, and its duration extended over many years.";
// Recorded API text (paragraphs, 63:0.1).
const TWINS = "URANTIA was registered as an inhabited world when the first two human beings — the twins — were eleven years old, and before they had become the parents of the first-born of the second generation of actual human beings. And the archangel message from Salvington, on this occasion of formal planetary recognition, closed with these words:";
const FIXTURES = join(process.cwd(), "e2e/fixtures");
const recorded = readdirSync(FIXTURES)
  .filter((name) => name.startsWith("paragraphs_"))
  .map((name) => (JSON.parse(readFileSync(join(FIXTURES, name), "utf8")) as { data: { text: string } }).data.text);

describe("the units of a text", () => {
  it("keep a sentence of 200 characters or less whole", () => {
    const first = units(TWINS)[0];
    expect(first).toEqual({ text: sentences(TWINS)[0], sentence: 0, first: true, last: true });
    // The second sentence ends with a colon, but it is short: one unit.
    expect(units(TWINS)).toHaveLength(2);
  });

  it("cut a long sentence after each ; and : that a space follows", () => {
    const of = units(SHU).filter((u) => u.sentence === 0);
    expect(of.length).toBeGreaterThan(1);
    of.slice(0, -1).forEach((u) => expect(u.text).toMatch(/[;:]$/));
    expect(of[0].first).toBe(true);
    expect(of.at(-1)?.last).toBe(true);
  });

  it("join a clause under 40 characters to the one before it", () => {
    const of = units(SHU).filter((u) => u.sentence === 0);
    expect(of.some((u) => u.text === "that Zû-yî had Wû Hsien's son;")).toBe(false);
    expect(of.at(-1)?.text).toBe("that Thâi-wû had Î Kih and Khăn Hû, through whom (his virtue) was made to affect God, and Wû Hsien who regulated the royal House; that Zû-yî had Wû Hsien's son; and that Wû-ting had Kan Phan.");
  });

  it("lose no character of a recorded paragraph", () => {
    for (const text of [...recorded, SHU, TWINS]) expect(units(text).map((u) => u.text).join(" ")).toBe(sentences(text).join(" "));
  });

  it("number their sentences as sentences() does", () => {
    for (const text of [...recorded, SHU]) expect(units(text).at(-1)?.sentence).toBe(sentences(text).length - 1);
  });
});

describe("the words of chosen units", () => {
  it("mark a cut inside a sentence at each end, without its ; or :", () => {
    const all = units(SHU);
    expect(unitsText(all, new Set([1]))).toBe("…that Thâi Kiâ had (the same Î Yin), the Pâo-hăng…");
  });

  it("are the words of chosenText for whole sentences", () => {
    for (const text of [...recorded, SHU]) {
      const all = units(text);
      const second = new Set(all.flatMap((u, i) => (u.sentence === 1 ? [i] : [])));
      const firstAndThird = new Set(all.flatMap((u, i) => (u.sentence === 0 || u.sentence === 2 ? [i] : [])));
      expect(unitsText(all, second)).toBe(chosenText(sentences(text), new Set([1])));
      expect(unitsText(all, firstAndThird)).toBe(chosenText(sentences(text), new Set([0, 2])));
    }
  });

  it("mark a gap between two clauses of one sentence", () => {
    const all = units(SHU);
    const last = all.findIndex((u) => u.sentence === 0 && u.last);
    expect(unitsText(all, new Set([0, last]))).toBe(`${all[0].text.replace(/;$/, "")} … ${all[last].text}`);
  });
});
