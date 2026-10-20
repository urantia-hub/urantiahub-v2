import type { LibraryWork, WorkPage, WorkPassage } from "@/content/library";
import { bookSlug } from "@/library/bible";
import { refId, unitNumber } from "@/library/refs";

// A passage of a world text in a pair link: digits and dots for a work with one prefix ("RV 10.10.3" is
// "10.10.3"), and the name as lower-case words first for a work with names ("1 Nephi 3:7" is "1-nephi.3.7").

const NUMBERS = /^\d{1,4}(?:\.\d{1,4})*(?:-\d{1,4})?$/;
const NAMED = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.(\d.*)$/;

const nameOf = (ref: string) => ref.slice(0, ref.length - unitNumber(ref).length).trim();

/** True when each page of the work starts with its prefix: the link holds the numbers only. */
function onePrefix(work: LibraryWork, pages: readonly WorkPage[]): boolean {
  return work.refPrefix !== "" && pages.length > 0 && pages.every((p) => p.firstRef.startsWith(`${work.refPrefix} `));
}

/** The passage as a part of a link. */
export function passageForLink(ref: string, work: LibraryWork, pages: readonly WorkPage[]): string {
  const numbers = unitNumber(ref).replace(/:/g, ".");
  return onePrefix(work, pages) ? numbers : `${bookSlug(nameOf(ref))}.${numbers}`;
}

/** The reference of the passage in a link, with the names and the colon that the work uses. Null for a form
 * that `passageForLink` does not write. */
export function passageFromLink(part: string, work: LibraryWork, pages: readonly WorkPage[]): string | null {
  let name: string | undefined;
  let numbers: string;
  if (onePrefix(work, pages)) {
    name = work.refPrefix;
    numbers = part;
  } else {
    const m = part.match(NAMED);
    if (!m) return null;
    name = pages.map((p) => nameOf(p.firstRef)).find((n) => bookSlug(n) === m[1]);
    numbers = m[2];
  }
  if (!name || !NUMBERS.test(numbers)) return null;
  // A work that writes "3:7" has a colon after its first number.
  const colon = pages.some((p) => unitNumber(p.firstRef).includes(":"));
  const ref = `${name} ${colon ? numbers.replace(".", ":") : numbers}`;
  return passageForLink(ref, work, pages) === part ? ref : null;
}

// The numbers before the last one ("7." of "7.22-24"), and the first and the last of the last one.
function spanOf(ref: string): { head: string; from: number; to: number } | null {
  const m = ref.match(/^(.*?)(\d+)(?:-(\d+))?$/);
  return m ? { head: m[1], from: Number(m[2]), to: Number(m[3] ?? m[2]) } : null;
}

/** The text of the passage: the passage itself, the passages of a range joined with a space, or the joined
 * passage that holds its number ("Dhp 26" in "Dhp 26-27"). Null when the page does not have it. */
export function passageText(ref: string, passages: readonly WorkPassage[]): { ref: string; text: string; ids: string[] } | null {
  const of = (found: readonly WorkPassage[], named: string) => ({ ref: named, text: found.map((p) => p.text).join(" "), ids: found.map((p) => refId(p.ref)) });
  const exact = passages.find((p) => p.ref === ref);
  if (exact) return of([exact], exact.ref);
  const want = spanOf(ref);
  if (!want) return null;
  const spans = passages.map((p) => ({ p, s: spanOf(p.ref) })).filter((x) => x.s?.head === want.head);
  const inRange = spans.filter((x) => x.s!.from >= want.from && x.s!.from <= want.to).map((x) => x.p);
  if (inRange.length > 0 && want.to > want.from) return of(inRange, ref);
  const holder = spans.find((x) => x.s!.from <= want.from && want.from <= x.s!.to)?.p;
  return holder ? of([holder], holder.ref) : null;
}
