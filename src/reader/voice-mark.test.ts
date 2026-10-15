import { afterEach, describe, expect, it, vi } from "vitest";
import { clearSentence, markSentence, sentenceMove } from "./voice-mark";

function page() {
  document.body.innerHTML = '<p class="para" id="1:0.1"><span class="text">The first one. The <em>second</em> one is here. Third.</span></p>';
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("the mark of the sentence that sounds", () => {
  it("marks sentence N of the paragraph, across the tags inside it", () => {
    page();
    const highlights = new Map<string, { ranges: Range[] }>();
    vi.stubGlobal("CSS", { highlights });
    vi.stubGlobal("Highlight", class { ranges: Range[]; constructor(...ranges: Range[]) { this.ranges = ranges; } });
    expect(markSentence("1:0.1", 1, 3)).toBe(true);
    expect(String(highlights.get("voice-now")?.ranges[0])).toBe("The second one is here.");
    clearSentence();
    expect(highlights.has("voice-now")).toBe(false);
  });

  it("marks nothing when the count of sentences differs from the map", () => {
    page();
    vi.stubGlobal("CSS", { highlights: new Map() });
    vi.stubGlobal("Highlight", class {});
    expect(markSentence("1:0.1", 0, 4)).toBe(false);
  });

  it("marks nothing in a browser with no highlight API", () => {
    page();
    vi.stubGlobal("CSS", {});
    expect(markSentence("1:0.1", 0, 3)).toBe(false);
  });
});

// A screen 800 px tall: the header covers the top 60 px, and the controls the lowest 120 px.
describe("the move of the page for a sentence that sounds", () => {
  it("is none while the sentence is in view", () => {
    expect(sentenceMove({ top: 300, bottom: 360 }, 800)).toBeNull();
    expect(sentenceMove({ top: 60, bottom: 680 }, 800)).toBeNull();
  });

  it("puts a sentence under the controls in the middle of the free part of the screen", () => {
    // The free part is 60 to 680, so its middle is 370. The sentence's middle is 730.
    expect(sentenceMove({ top: 700, bottom: 760 }, 800)).toBe(360);
  });

  it("puts a sentence above the header in the middle too", () => {
    expect(sentenceMove({ top: 20, bottom: 80 }, 800)).toBe(-320);
  });

  it("puts the start of a sentence taller than the free part just below the header", () => {
    expect(sentenceMove({ top: 600, bottom: 1400 }, 800)).toBe(524);
  });
});
