import { describe, expect, it } from "vitest";
import { exactSnippet, relatedSnippet } from "./snippet";

const mark = (word: string) => `<span class=urantia-dev-highlighted>${word}</span>`;
const text = (parts: { text: string }[]) => parts.map((p) => p.text).join("");

describe("exactSnippet", () => {
  it("marks each matched word and keeps the other words plain", () => {
    const parts = exactSnippet(`<span class="urantia-dev-pb-0">The ${mark("Thought")} ${mark("Adjuster")} is here.</span>`);
    expect(parts).toEqual([
      { text: "The ", marked: false },
      { text: "Thought", marked: true },
      { text: " ", marked: false },
      { text: "Adjuster", marked: true },
      { text: " is here.", marked: false },
    ]);
  });
  it("starts near the first matched word in a long paragraph, at a word start", () => {
    const html = `${"word ".repeat(80)}${mark("target")} ${"tail ".repeat(80)}`;
    const parts = exactSnippet(html);
    expect(parts[0]).toEqual({ text: "… ", marked: false });
    expect(parts.some((p) => p.marked && p.text === "target")).toBe(true);
    expect(parts.at(-1)).toEqual({ text: " …", marked: false });
    expect(text(parts).length).toBeLessThanOrEqual(270);
    expect(text(parts)).toMatch(/^… word /);
  });
  // Review Focus 3.
  it("never cuts inside a marked word", () => {
    const html = `${"a ".repeat(125)}${mark("supercalifragilistic")} end ${"z ".repeat(60)}`;
    for (const part of exactSnippet(html)) {
      if (part.marked) expect(part.text).toBe("supercalifragilistic");
      expect(part.text).not.toMatch(/[\u0001\u0002]/);
    }
  });
  it("puts a space where the source has a dot leader", () => {
    const html = `<span class="pra">One system embraces, ${mark("approximately")}<span class="dot"></span><span class="ran">1,000 worlds</span></span>`;
    expect(text(exactSnippet(html))).toBe("One system embraces, approximately 1,000 worlds");
  });
  it("reads entities as their characters", () => {
    expect(text(exactSnippet(`Father &amp; Son &lt;here&gt; &quot;now&quot; it&#39;s`))).toBe(`Father & Son <here> "now" it's`);
  });
  it("gives the start of the paragraph when nothing is marked", () => {
    expect(exactSnippet("<em>Plain</em> text.")).toEqual([{ text: "Plain text.", marked: false }]);
  });
});

describe("relatedSnippet", () => {
  it("gives a short paragraph whole", () => {
    expect(relatedSnippet('<span class="urantia-dev-pb-0">I am the living bridge.</span>')).toEqual([{ text: "I am the living bridge.", marked: false }]);
  });
  it("cuts a long paragraph at a word end and adds an ellipsis", () => {
    const parts = relatedSnippet(`<span>${"alpha ".repeat(100)}</span>`);
    expect(text(parts)).toMatch(/alpha …$/);
    expect(text(parts).length).toBeLessThanOrEqual(244);
  });
  it("never marks a word", () => {
    expect(relatedSnippet(`The ${mark("word")} here`).every((p) => !p.marked)).toBe(true);
  });
});
