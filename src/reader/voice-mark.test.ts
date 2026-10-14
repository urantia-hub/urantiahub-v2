import { afterEach, describe, expect, it, vi } from "vitest";
import { clearSentence, markSentence } from "./voice-mark";

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
