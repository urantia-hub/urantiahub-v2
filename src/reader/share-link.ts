import { chosenText, sentences, type Unit, units, unitsText } from "@/image/compose";

// A shared link names a paragraph and, if the reader chose some, its sentences: /s/2.5.10/1.3-4.
// It holds digits, dots, and hyphens only. A chat app ends a link at a colon or a comma, and reads an
// underscore or an asterisk as a format mark. It holds numbers and never words, so nobody can make the
// preview of this site show words that are not in the Papers.

const LAST_PAPER = 196;
const REF = /^(\d{1,3})[.:](\d{1,2})\.(\d{1,3})$/;
// A code of whole sentences ("1.3-4"), or of units when the choice holds a clause ("p4-5").
const CODE = /^p?\d{1,3}(?:-\d{1,3})?(?:\.\d{1,3}(?:-\d{1,3})?)*$/;

/** True for the form of a code of chosen sentences or units. */
export const isCode = (part: string) => part.length <= 60 && CODE.test(part);

/** "2:5.10" as a part of a link: "2.5.10". */
export function refForLink(ref: string): string {
  return ref.replace(":", ".");
}

/** The paragraph that a part of a link names. The form with a colon is read too. */
export function refFromLink(part: string): string | null {
  const match = REF.exec(part);
  if (!match || Number(match[1]) > LAST_PAPER) return null;
  return `${Number(match[1])}:${Number(match[2])}.${Number(match[3])}`;
}

/** The chosen sentences as a part of a link. Empty for none and for all: that is the whole paragraph. */
export function pickCode(chosen: ReadonlySet<number>, total: number): string {
  if (chosen.size === 0 || chosen.size >= total) return "";
  const runs: [number, number][] = [];
  for (const i of [...chosen].sort((a, b) => a - b)) {
    const last = runs[runs.length - 1];
    if (last && last[1] === i - 1) last[1] = i;
    else runs.push([i, i]);
  }
  return runs.map(([a, b]) => (a === b ? String(a + 1) : `${a + 1}-${b + 1}`)).join(".");
}

/** The sentences that a code names. Null for a code that this site does not write for this paragraph. */
export function parsePick(code: string, total: number): ReadonlySet<number> | null {
  if (code.length > 60 || !CODE.test(code)) return null;
  const chosen = new Set<number>();
  for (const run of code.split(".")) {
    const [a, b = a] = run.split("-").map(Number);
    if (a < 1 || b < a || b > total) return null;
    for (let i = a; i <= b; i += 1) chosen.add(i - 1);
  }
  // One choice has one link.
  return pickCode(chosen, total) === code ? chosen : null;
}

/** The chosen units as a part of a link: the sentence code when they are whole sentences, else "p" and the units. */
export function unitCode(chosen: ReadonlySet<number>, all: readonly Unit[]): string {
  if (chosen.size === 0 || chosen.size >= all.length) return "";
  const picked = [...chosen].filter((i) => i >= 0 && i < all.length);
  const whole = picked.every((i) => all.every((u, j) => u.sentence !== all[i].sentence || chosen.has(j)));
  if (whole) return pickCode(new Set(picked.map((i) => all[i].sentence)), (all.at(-1)?.sentence ?? -1) + 1);
  return `p${pickCode(chosen, all.length)}`;
}

/** The units that a code names. Null for a code that this site does not write for this text. */
export function parseUnitCode(code: string, all: readonly Unit[]): ReadonlySet<number> | null {
  if (!code.startsWith("p")) {
    const chosen = parsePick(code, (all.at(-1)?.sentence ?? -1) + 1);
    return chosen && new Set(all.flatMap((u, i) => (chosen.has(u.sentence) ? [i] : [])));
  }
  const chosen = parsePick(code.slice(1), all.length);
  // One choice has one link: a choice of whole sentences has its sentence code.
  return chosen && unitCode(chosen, all) === code ? chosen : null;
}

export function sharePath(ref: string, chosen: ReadonlySet<number>, all: readonly Unit[]): string {
  const code = unitCode(chosen, all);
  return `/s/${refForLink(ref)}${code ? `/${code}` : ""}`;
}

/** The words that a link shows: the whole paragraph, or the chosen sentences with "…" for each gap. */
export function sharedWords(text: string, chosen: ReadonlySet<number>): string {
  const all = sentences(text);
  return chosen.size === 0 || chosen.size >= all.length ? all.join(" ") : chosenText(all, chosen);
}

/** The words that a link shows: the whole text, or the chosen units with "…" for each cut. */
export function unitWords(text: string, chosen: ReadonlySet<number>): string {
  const all = units(text);
  return chosen.size === 0 || chosen.size >= all.length ? all.map((u) => u.text).join(" ") : unitsText(all, chosen);
}

/** A text cut at a word, with a mark that more follows. */
export function cutWords(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s.,;:]+$/, "")} …`;
}

/** The start and the end of each sentence in a text as the page holds it, with any white space. */
export function sentenceRanges(text: string): [number, number][] {
  return rangesOf(sentences(text), text);
}

/** The start and the end of each unit in a text as the page holds it. */
export function unitRanges(text: string): [number, number][] {
  return rangesOf(units(text).map((u) => u.text), text);
}

function rangesOf(parts: readonly string[], text: string): [number, number][] {
  const ranges: [number, number][] = [];
  let from = 0;
  for (const sentence of parts) {
    const words = sentence.split(" ").map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const found = new RegExp(words.join("\\s+")).exec(text.slice(from));
    if (!found) return [];
    ranges.push([from + found.index, from + found.index + found[0].length]);
    from += found.index + found[0].length;
  }
  return ranges;
}

/** A paper address that a shared link with chosen sentences opened: ?s=1.3-4#2:5.10. */
export function sharedFromAddress(search: string, hash: string): { ref: string; code: string } | null {
  const code = new URLSearchParams(search).get("s");
  if (!code || !CODE.test(code)) return null;
  let id = "";
  try {
    id = decodeURIComponent(hash.slice(1));
  } catch {
    return null;
  }
  const ref = refFromLink(id);
  return ref && ref === id ? { ref, code } : null;
}

// The most passages that a range of a pair link can join.
const MOST_PASSAGES = 50;

/** The passage of a world text page that a pair link opened: its id, the chosen units, and the count of passages
 * of a range that the units run across. */
export function sharedPassageFromAddress(search: string, hash: string): { id: string; code: string; count: number } | null {
  const params = new URLSearchParams(search);
  const code = params.get("s");
  const count = Number(params.get("n") ?? "1");
  if (!code || !isCode(code) || !Number.isInteger(count) || count < 1 || count > MOST_PASSAGES) return null;
  try {
    const id = decodeURIComponent(hash.slice(1));
    return id ? { id, code, count } : null;
  } catch {
    return null;
  }
}
