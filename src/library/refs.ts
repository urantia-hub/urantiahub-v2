// References of a work in the Library: the key of a page in its address, the page that holds a reference,
// and the reference that reads a whole page. A reference is a name or prefix, then numbers: "Dhp 21",
// "RV 10.129.1", "1 Nephi 3:7", "Theogony 1-25".

export type PageRefs = { key: string; firstRef: string; lastRef: string };

/** "14" for a division, "10-129" for a subdivision of a work with three levels. */
export function pageKey(division: number, subdivision: number | null): string {
  return subdivision === null ? String(division) : `${division}-${subdivision}`;
}

export function parsePageKey(key: string): { division: number; subdivision: number | null } | null {
  const m = key.match(/^(\d{1,4})(?:-(\d{1,4}))?$/);
  if (!m) return null;
  return { division: Number(m[1]), subdivision: m[2] === undefined ? null : Number(m[2]) };
}

/** The id of a passage in the page: "RV 10.129.1" gives "RV_10.129.1". */
export function refId(ref: string): string {
  return ref.replace(/\s+/g, "_");
}

// The name or prefix, and the numbers after it. The name holds a letter; "1 Nephi" is a name.
const PARTS = /^(.*?\p{L}.*?)\s+(\d[\d.:-]*)$/u;

/** The numbers of a reference without its name: "RV 10.129.1" gives "10.129.1". */
export function unitNumber(ref: string): string {
  return ref.match(PARTS)?.[2] ?? ref;
}

/** The reference with its last number removed: "RV 10.48.6-7" gives "RV 10.48", "Voluspo 3" gives "Voluspo". */
function base(ref: string): string | null {
  const m = ref.match(PARTS);
  if (!m) return null;
  const numbers = m[2].replace(/-\d+$/, "");
  const cut = numbers.search(/[.:]\d+$/);
  return cut < 0 ? m[1] : `${m[1]} ${numbers.slice(0, cut)}`;
}

/** The first and the last number of a reference with one level: "Dhp 195-196" gives [195, 196]. */
function span(ref: string): [number, number] | null {
  const m = ref.match(PARTS)?.[2].match(/^(\d+)(?:-(\d+))?$/);
  return m ? [Number(m[1]), Number(m[2] ?? m[1])] : null;
}

/** The reference that reads the whole page from the API. */
export function pageReadRef(levels: number, page: { firstRef: string; lastRef: string }): string {
  if (levels === 1) {
    const last = span(page.lastRef)?.[1];
    const first = span(page.firstRef)?.[0];
    return last === undefined || last === first ? page.firstRef : `${page.firstRef.replace(/-\d+$/, "")}-${last}`;
  }
  return base(page.firstRef) ?? page.firstRef;
}

/** The page that holds a reference in a work with `levels` levels, or null. */
export function pageOfRef<P extends PageRefs>(levels: number, pages: P[], ref: string): P | null {
  if (levels === 1) {
    const at = span(ref);
    if (!at) return null;
    return pages.find((p) => (span(p.firstRef)?.[0] ?? Infinity) <= at[0] && at[0] <= (span(p.lastRef)?.[1] ?? -1)) ?? null;
  }
  const b = base(ref);
  return b === null ? null : (pages.find((p) => base(p.firstRef) === b) ?? null);
}
