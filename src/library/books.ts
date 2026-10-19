import type { LibraryWork, WorkPage } from "@/content/library";
import type { BookRow } from "./bible";

// The works that read by books: the books sheet takes the place of the chapters list, and a book opens as a grid
// of numbers. The value is the word for one page of the work. The Bible has its own books (`bibleBooks`).
export const GROUPED: Record<string, string> = { "book-of-mormon": "chapter", "rig-veda": "hymn", "prose-edda": "chapter" };

const capital = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/** Each book of a work once, in order: named by its references ("1 Nephi", "Gylfaginning"), or "Book 3". */
export function workBooks(work: Pick<LibraryWork, "refPrefix" | "divisionLabel">, pages: WorkPage[]): BookRow[] {
  const rows = new Map<number, BookRow>();
  for (const p of pages) {
    const row = rows.get(p.division);
    if (row) {
      row.numbers.push(p.subdivision ?? 0);
      continue;
    }
    const named = p.firstRef.replace(/\s+[\d.:-]+$/, "");
    const name = named === work.refPrefix ? `${capital(work.divisionLabel)} ${p.division}` : named;
    rows.set(p.division, { code: String(p.division), name, title: "", part: "", base: `${p.division}-`, numbers: [p.subdivision ?? 0] });
  }
  return [...rows.values()];
}
