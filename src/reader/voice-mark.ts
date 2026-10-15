import { sentenceRanges } from "./share-link";
import { rangeOf } from "./text-range";

// The sentence that the voice reads is at full ink, and the rest of its paragraph is softer (CSS `data-soft`).
// The paragraph is server HTML, so the mark is a highlight and no tag.
const NAME = "voice-now";
// The free part of the screen: below the header, and above the controls (as `inView` in `ReadingNav`).
const TOP = 60;
const BOTTOM = 120;
// The range of the sentence that is marked now.
let marked: Range | null = null;

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
  marked = rangeOf(text, range);
  CSS.highlights.set(NAME, new Highlight(marked));
  return true;
}

export function clearSentence() {
  marked = null;
  if (can()) CSS.highlights.delete(NAME);
}

// Where the marked sentence is on the screen, or null when no sentence is marked.
export function sentenceBox(): { top: number; bottom: number } | null {
  if (!marked || typeof marked.getBoundingClientRect !== "function") return null;
  const { top, bottom } = marked.getBoundingClientRect();
  return { top, bottom };
}

// How far the page must scroll to put a sentence in the middle of the free part of the screen, or null
// while the sentence is in view. A sentence taller than the free part gets its start just below the header.
export function sentenceMove(box: { top: number; bottom: number }, height: number): number | null {
  const low = height - BOTTOM;
  if (box.top >= TOP && box.bottom <= low) return null;
  if (box.bottom - box.top > low - TOP) return box.top - (TOP + 16);
  return (box.top + box.bottom) / 2 - (TOP + low) / 2;
}
