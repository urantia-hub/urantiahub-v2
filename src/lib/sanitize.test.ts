import { describe, expect, it } from "vitest";
import { sanitizeParagraphHtml } from "./sanitize";

describe("sanitizeParagraphHtml", () => {
  it("keeps the known tags and classes", () => {
    const html = '<span class="urantia-dev-pb-0">THE <em>Universal</em> Father<sup>1</sup></span>';
    expect(sanitizeParagraphHtml(html)).toBe(html);
  });

  it("keeps the scaps class", () => {
    expect(sanitizeParagraphHtml('<span class="scaps">Lord</span>')).toBe('<span class="scaps">Lord</span>');
  });

  it("removes a class that is not on the list and keeps the others", () => {
    expect(sanitizeParagraphHtml('<span class="urantia-dev-pb-2 evil">x</span>')).toBe(
      '<span class="urantia-dev-pb-2">x</span>',
    );
    expect(sanitizeParagraphHtml('<span class="evil">x</span>')).toBe("<span>x</span>");
  });

  it("removes every attribute other than class", () => {
    expect(sanitizeParagraphHtml('<span onclick="alert(1)" style="color:red" class="scaps">x</span>')).toBe(
      '<span class="scaps">x</span>',
    );
    expect(sanitizeParagraphHtml("<em id=a>x</em>")).toBe("<em>x</em>");
  });

  // Review Focus 3: unknown markup goes, the words stay.
  it("removes an unknown tag and keeps its words", () => {
    expect(sanitizeParagraphHtml("before <blockquote>the words</blockquote> after")).toBe(
      "before the words after",
    );
    expect(sanitizeParagraphHtml('<a href="https://x.test">link words</a>')).toBe("link words");
  });

  it("makes a script tag harmless", () => {
    const out = sanitizeParagraphHtml('<script>alert(1)</script><img src=x onerror="alert(1)">');
    expect(out).not.toContain("<script");
    expect(out).not.toContain("<img");
    expect(out).not.toContain("onerror");
  });

  it("removes a comment", () => {
    expect(sanitizeParagraphHtml("a<!-- hidden -->b")).toBe("ab");
  });

  it("escapes a lone angle bracket", () => {
    expect(sanitizeParagraphHtml("1 < 2")).toBe("1 &lt; 2");
  });

  it("writes tag names in lower case", () => {
    expect(sanitizeParagraphHtml("<EM>x</EM>")).toBe("<em>x</em>");
  });

  it("leaves plain text and its punctuation alone", () => {
    const text = "“You, God, are alone” — one God in the place of many gods.";
    expect(sanitizeParagraphHtml(text)).toBe(text);
  });
});
