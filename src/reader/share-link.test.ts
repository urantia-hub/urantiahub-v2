import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { chosenText, sentences, units } from "@/image/compose";
import { cutWords, parsePick, parseUnitCode, pickCode, refForLink, refFromLink, sentenceRanges, sharePath, sharedWords, sharedFromAddress, unitCode, unitRanges, unitWords } from "./share-link";

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
    const five = units("One. Two. Three. Four. Five.");
    expect(sharePath("2:5.10", set(), five)).toBe("/s/2.5.10");
    expect(sharePath("2:5.10", set(0, 2, 3), five)).toBe("/s/2.5.10/1.3-4");
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
    expect(sharedFromAddress("?s=p4-5", "#2:5.10")).toEqual({ ref: "2:5.10", code: "p4-5" });
  });
  it("is nothing with no choice, no paragraph, or a wrong form", () => {
    expect(sharedFromAddress("", "#2:5.10")).toBeNull();
    expect(sharedFromAddress("?s=3", "")).toBeNull();
    expect(sharedFromAddress("?s=abc", "#2:5.10")).toBeNull();
    expect(sharedFromAddress("?s=3", "#%E0")).toBeNull();
  });
});

// Recorded API text (works.read, Shu King, Legge 1879).
const SHU = "The duke said, 'Prince Shih, I have heard that aforetime, when Thang the Successful had received the appointment (to the throne), he had with him Î Yin, making (his virtue) like that of great Heaven; that Thâi Kiâ had (the same Î Yin), the Pâo-hăng; that Thâi-wû had Î Kih and Khăn Hû, through whom (his virtue) was made to affect God, and Wû Hsien who regulated the royal House; that Zû-yî had Wû Hsien's son; and that Wû-ting had Kan Phan. (These ministers) carried out (their principles), and displayed (their merit), preserving and regulating the dynasty of Yin, so that, while its ceremonies lasted, (those sovereigns), when deceased, were assessors to Heaven, and its duration extended over many years.";
const FIXTURES = join(process.cwd(), "e2e/fixtures");
const recorded = readdirSync(FIXTURES)
  .filter((name) => name.startsWith("paragraphs_"))
  .map((name) => (JSON.parse(readFileSync(join(FIXTURES, name), "utf8")) as { data: { text: string } }).data.text);
// The rules of a shared link before clauses, kept here as the reference for old links.
const oldWords = (text: string, code: string) => {
  const all = sentences(text);
  const chosen = parsePick(code, all.length) ?? new Set<number>();
  return chosen.size === 0 || chosen.size >= all.length ? all.join(" ") : chosenText(all, chosen);
};

describe("the chosen units in a link", () => {
  it("show the words of an old sentence code", () => {
    for (const text of [...recorded, SHU])
      for (const code of ["1", "2-3", "1.3"]) {
        if (parsePick(code, sentences(text).length) === null) continue;
        expect(unitWords(text, parseUnitCode(code, units(text)) ?? new Set())).toBe(oldWords(text, code));
      }
  });
  it("write the sentence code for whole sentences", () => {
    const all = units(SHU);
    const of = (...s: number[]) => new Set(all.flatMap((u, i) => (s.includes(u.sentence) ? [i] : [])));
    expect(unitCode(of(0), all)).toBe("1");
    expect(unitCode(of(1), all)).toBe("2");
  });
  it("write the p form for a clause", () => {
    const all = units(SHU);
    expect(unitCode(set(1, 2), all)).toBe("p2-3");
    expect(parseUnitCode("p2-3", all)).toEqual(set(1, 2));
  });
  it("have one code for one choice", () => {
    const all = units(SHU);
    const first = all.flatMap((u, i) => (u.sentence === 0 ? [i + 1] : []));
    expect(parseUnitCode(`p${first[0]}-${first.at(-1)}`, all)).toBeNull();
  });
  it("refuse a code that the text does not have", () => {
    const all = units(SHU);
    for (const bad of ["p99", "0", "p", "p3-2", "p0", "9", "q1", "p1.", "P1"]) expect(parseUnitCode(bad, all)).toBeNull();
  });
  it("are empty for none and for all", () => {
    const all = units(SHU);
    expect(unitCode(set(), all)).toBe("");
    expect(unitCode(new Set(all.map((_, i) => i)), all)).toBe("");
  });
});

describe("where each unit is in the text of the page", () => {
  it("covers each unit, with more white space between words", () => {
    const page = SHU.replace("Heaven; that Thâi", "Heaven;\n   that Thâi");
    expect(unitRanges(page).map(([a, b]) => page.slice(a, b).replace(/\s+/g, " "))).toEqual(units(SHU).map((u) => u.text));
  });
});
