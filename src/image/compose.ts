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
