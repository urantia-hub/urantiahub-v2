import { sentenceRanges } from "./share-link";
import { rangeOf } from "./text-range";

// The sentence that the voice reads is at full ink, and the rest of its paragraph is softer (CSS `data-soft`).
// The paragraph is server HTML, so the mark is a highlight and no tag.
const NAME = "voice-now";

function can(): boolean {
  return typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight === "function";
}

// False when the browser has no highlight API, or the page splits the text into another count of sentences
// than the time map: then no sentence is marked, and the whole paragraph stays at full ink.
export function markSentence(ref: string, sentence: number, count: number): boolean {
  if (!can()) return false;
  const text = document.getElementById(ref)?.querySelector(":scope > .text");
  if (!text) return false;
  const ranges = sentenceRanges(text.textContent ?? "");
  const range = ranges[sentence];
  if (ranges.length !== count || !range) return false;
  // The rule is added here: the CSS tool of the build does not know `::highlight` yet.
  if (!document.getElementById("voice-mark")) {
    const style = document.createElement("style");
    style.id = "voice-mark";
    style.textContent = "::highlight(voice-now){color:var(--ink)}";
    document.head.append(style);
  }
  CSS.highlights.set(NAME, new Highlight(rangeOf(text, range)));
  return true;
}

export function clearSentence() {
  if (can()) CSS.highlights.delete(NAME);
}
