import { describe, expect, it } from "vitest";
import { ASSISTANTS, CONTEXT_ROOM, PAPER_QUESTIONS, PARAGRAPH_QUESTIONS, assistantHref, canPrefill, contextWithin, paperPrompt, paragraphPrompt } from "./assistant";

const BASE = {
  question: "Explain this paragraph in plain words.",
  paper: { id: "1", title: "The Universal Father" },
  section: { id: "1", title: "The Father’s Name" },
  before: [
    { ref: "1:1.1", text: "First words." },
    { ref: "1:1.2", text: "Second words." },
  ],
  ref: "1:1.3",
  text: "Third words.",
  link: "https://www.urantiahub.com/s/1.1.3",
};

describe("paragraphPrompt", () => {
  it("starts with the question, so the assistant and the reader see it first", () => {
    expect(paragraphPrompt(BASE).startsWith("Explain this paragraph in plain words.\n\n")).toBe(true);
  });

  it("names the paper, the section, the paragraphs before it, and the paragraph, in the order of the text", () => {
    const prompt = paragraphPrompt(BASE);
    const places = ['Paper 1, "The Universal Father", section 1, "The Father’s Name"', "1:1.1 First words.", "1:1.2 Second words.", "I ask about this paragraph:\n1:1.3 Third words.", "https://www.urantiahub.com/s/1.1.3"].map((part) => prompt.indexOf(part));
    expect(places.every((at) => at > 0)).toBe(true);
    expect([...places].sort((a, b) => a - b)).toEqual(places);
  });

  it("says nothing of earlier paragraphs for the first paragraph of a section", () => {
    const prompt = paragraphPrompt({ ...BASE, before: [] });
    expect(prompt).not.toContain("Before it");
    expect(prompt).toContain("I ask about this paragraph:\n1:1.3 Third words.");
  });

  it("names no section number for the opening of a paper", () => {
    const prompt = paragraphPrompt({ ...BASE, section: null, ref: "1:0.1" });
    expect(prompt).toContain('Paper 1, "The Universal Father", the opening of the paper.');
    expect(prompt).not.toContain("section 1");
  });

  it("names the Foreword with no paper number", () => {
    expect(paragraphPrompt({ ...BASE, paper: { id: "0", title: "Foreword" } })).toContain('The Urantia Papers, "Foreword", section 1');
  });

  it("keeps only the nearest paragraphs of a long section", () => {
    const long = "word ".repeat(100).trim();
    const before = Array.from({ length: 6 }, (_, i) => ({ ref: `1:1.${i + 1}`, text: long }));
    const prompt = paragraphPrompt({ ...BASE, before, ref: "1:1.7" });
    expect(prompt).toContain("1:1.6 word");
    expect(prompt).toContain("1:1.5 word");
    expect(prompt).not.toContain("1:1.4 word");
  });

  it("tells the assistant where more is: the connector, then one public address with the terms and the parallels", () => {
    const prompt = paragraphPrompt(BASE);
    expect(prompt).toContain("Urantia Papers connector");
    expect(prompt).toContain("https://api.urantia.dev/paragraphs/1:1.3?include=entities,urantiaParallels,bibleParallels,scriptureParallels");
    expect(prompt).toContain("https://api.urantia.dev/openapi.json");
    expect(prompt).toContain("such as 1:1.3");
  });

  // Kelson, 2026-10-12: the first form was massive. All that is not text of the Papers stays small.
  it("adds few words of its own to the text of the Papers", () => {
    const own = paragraphPrompt(BASE).length - BASE.text.length - BASE.before.reduce((sum, one) => sum + one.text.length, 0);
    expect(own).toBeLessThan(620);
    expect(CONTEXT_ROOM).toBeLessThanOrEqual(1200);
  });

  // Kelson, 2026-10-12: the two products are apart, and an address of an account is never promoted.
  it("names no address of an account", () => {
    expect(paragraphPrompt(BASE)).not.toMatch(/\/me\b|\/auth\b|accounts\./);
  });
});

describe("paperPrompt", () => {
  it("names the paper and where to read it, in few words", () => {
    const prompt = paperPrompt({ question: "Give me the short version of this paper.", paper: { id: "1", title: "The Universal Father" }, link: "https://www.urantiahub.com/papers/paper-1-the-universal-father" });
    expect(prompt.startsWith("Give me the short version of this paper.\n\n")).toBe(true);
    expect(prompt).toContain('Paper 1, "The Universal Father"');
    expect(prompt).toContain("https://www.urantiahub.com/papers/paper-1-the-universal-father");
    expect(prompt).toContain("https://api.urantia.dev/papers/1");
    expect(prompt).toContain("such as 1:0.1");
    expect(prompt.length).toBeLessThan(520);
  });
});

describe("contextWithin", () => {
  it("keeps all when they fit", () => {
    expect(contextWithin([{ ref: "1:1.1", text: "a" }], 100)).toEqual({ kept: [{ ref: "1:1.1", text: "a" }], cut: false });
  });

  it("drops from the far end, and never a paragraph in the middle", () => {
    const before = [
      { ref: "a", text: "x".repeat(60) },
      { ref: "b", text: "x".repeat(60) },
      { ref: "c", text: "x".repeat(10) },
    ];
    expect(contextWithin(before, 70)).toEqual({ kept: [before[2]], cut: true });
    expect(contextWithin(before, 80)).toEqual({ kept: [before[1], before[2]], cut: true });
  });

  it("has room for a link that an assistant accepts", () => {
    expect(CONTEXT_ROOM).toBeLessThanOrEqual(3500);
  });
});

describe("assistantHref", () => {
  it("puts the question in the address for an assistant that reads it there", () => {
    expect(assistantHref("claude", "a b&c")).toBe("https://claude.ai/new?q=a%20b%26c");
    expect(assistantHref("chatgpt", "a")).toBe("https://chatgpt.com/?q=a");
    expect(assistantHref("grok", "a")).toBe("https://grok.com/?q=a");
  });

  it("gives the plain address for an assistant that does not: the reader pastes the question", () => {
    expect(assistantHref("gemini", "a b")).toBe("https://gemini.google.com/app");
    expect(ASSISTANTS.find((one) => one.id === "gemini")?.prefill).toBe(false);
  });
});

describe("canPrefill", () => {
  // Kelson, 2026-10-12: Grok answered error 431 for a link of about 4,500 characters. Its server takes
  // about 8,000 characters of headers in all, and the cookies of a signed-in reader are a part of that.
  it("is false for Grok when the link is long, so the reader pastes the question", () => {
    expect(canPrefill("grok", "short")).toBe(true);
    expect(canPrefill("grok", "word ".repeat(600))).toBe(false);
  });

  it("is true for a long link on an assistant with no known limit", () => {
    expect(canPrefill("claude", "word ".repeat(600))).toBe(true);
    expect(canPrefill("chatgpt", "word ".repeat(600))).toBe(true);
  });

  it("is false for an assistant that reads no question from its address", () => {
    expect(canPrefill("gemini", "short")).toBe(false);
  });
});

describe("the ready questions", () => {
  it("each kind has one that asks for a visual, with no word on the form of it", () => {
    for (const list of [PARAGRAPH_QUESTIONS, PAPER_QUESTIONS]) {
      const visual = list.filter((q) => /visual/i.test(q));
      expect(visual).toHaveLength(1);
      expect(visual[0]).not.toMatch(/html|artifact|svg|diagram|chart|image|file/i);
    }
  });

  // The Hub's own copy makes no claim about the text.
  it("makes no statement: each one is a request or a question", () => {
    for (const q of [...PARAGRAPH_QUESTIONS, ...PAPER_QUESTIONS]) expect(q).toMatch(/[.?]$/);
  });
});
