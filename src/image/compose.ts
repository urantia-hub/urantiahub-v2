// The text of an image of one paragraph: its sentences, the ones that the reader chose, and the lines
// at the largest type that fits. No canvas here, so each rule has a test.

const SHORT = /(?:\b(?:A\.D|B\.C|St|Mr|Mrs|Dr|vs|etc|i\.e|e\.g)|^\d+)\.$/;

/** The sentences of a paragraph. A closing quote stays with its sentence. */
export function sentences(text: string): string[] {
  const found: string[] = [];
  let current = "";
  for (const part of text.trim().split(/(?<=[.!?][”’"')\]]*)\s+/)) {
    if (!part) continue;
    current = current ? `${current} ${part}` : part;
    // "A.D. 68" and "1. The Gospel" do not end a sentence.
    if (SHORT.test(current.replace(/[”’"')\]]+$/, ""))) continue;
    found.push(current);
    current = "";
  }
  if (current) found.push(current);
  return found;
}

/** The chosen sentences in their order, with "…" for each part that is left out between two of them. */
export function chosenText(all: readonly string[], chosen: ReadonlySet<number>): string {
  const parts: string[] = [];
  let gap = false;
  all.forEach((sentence, i) => {
    if (chosen.has(i)) {
      // No mark before the first sentence or after the last: a quote can start and stop in a paragraph.
      if (gap && parts.length > 0) parts.push("…");
      parts.push(sentence);
      gap = false;
    } else gap = true;
  });
  return parts.join(" ");
}

/** A part that a reader can choose: a sentence, or a clause of a long sentence. */
export type Unit = { text: string; sentence: number; first: boolean; last: boolean };

// A sentence longer than this is cut into clauses, and a clause shorter than the least joins its neighbor.
export const CLAUSE_FROM = 200;
export const CLAUSE_LEAST = 40;

/** The units of a text: its sentences, with each long sentence cut after a ";" or ":" that a space follows. */
export function units(text: string): Unit[] {
  return sentences(text).flatMap((sentence, i) => {
    const parts: string[] = [];
    for (const clause of sentence.length > CLAUSE_FROM ? sentence.split(/(?<=[;:])\s+/) : [sentence]) {
      if (parts.length > 0 && clause.length < CLAUSE_LEAST) parts[parts.length - 1] += ` ${clause}`;
      else parts.push(clause);
    }
    // A short first clause joins the next one.
    if (parts.length > 1 && parts[0].length < CLAUSE_LEAST) parts.splice(0, 2, `${parts[0]} ${parts[1]}`);
    return parts.map((part, n) => ({ text: part, sentence: i, first: n === 0, last: n === parts.length - 1 }));
  });
}

/** The chosen units in order: "…" for a gap, and at an end that is inside a sentence, where its ";" or ":" goes. */
export function unitsText(all: readonly Unit[], chosen: ReadonlySet<number>): string {
  const on = [...chosen].filter((i) => i >= 0 && i < all.length).sort((a, b) => a - b);
  let out = "";
  on.forEach((i, n) => {
    const unit = all[i];
    const next = on[n + 1];
    // A cut after this unit inside its sentence drops the mark that the cut ends.
    const text = !unit.last && next !== i + 1 ? unit.text.replace(/[;:]$/, "") : unit.text;
    if (n === 0) out = unit.first ? "" : "…";
    else out += on[n - 1] === i - 1 ? " " : " … ";
    out += text;
    if (next === undefined && !unit.last) out += "…";
  });
  return out;
}

export type Measure = (text: string, size: number) => number;

export function wrap(text: string, size: number, width: number, measure: Measure): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next, size) > width) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export type Room = { width: number; height: number; sizes: readonly number[]; lineHeight: number };

/** The largest type of `sizes` at which the text fits the room, with its lines. Null when none fits. */
export function fit(text: string, room: Room, measure: Measure): { size: number; lines: string[] } | null {
  for (const size of room.sizes) {
    const lines = wrap(text, size, room.width, measure);
    const widest = Math.max(0, ...lines.map((line) => measure(line, size)));
    if (lines.length * size * room.lineHeight <= room.height && widest <= room.width) return { size, lines };
  }
  return null;
}
