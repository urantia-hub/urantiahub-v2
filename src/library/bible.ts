import type { WorkPage } from "@/content/library";
import type { Lang } from "@/i18n/lang";

// The Bible in World texts: one page for each chapter, from the list of its books. A page is read by the book
// code ("DanGr 3"), and its verses are named by the book name ("Daniel (Greek) 3:5").
export const BIBLE = "bible";

export type BibleBook = { bookCode: string; bookName: string; fullName: string; bookOrder: number; canon: string; chapterCount: number };
/** A row of the books sheet: a book, and the numbers of its pages, each at the address `base` + number. */
export type BookRow = { code: string; name: string; title: string; part: string; base: string; numbers: number[] };

export const BIBLE_PARTS: Record<Lang, Record<string, string>> = {
  en: { ot: "Old Testament", deuterocanon: "Deuterocanon", nt: "New Testament" },
  es: { ot: "Antiguo Testamento", deuterocanon: "Deuterocanónicos", nt: "Nuevo Testamento" },
};

/** "Daniel (Greek)" gives "daniel-greek": the book in the address of its chapters. */
export const bookSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** One page for each chapter, in the order of the books. The count of verses is not known before a read: 0.
 * `names` are the books in another language, by code: they name the book, and the address keeps the English name. */
export function biblePages(books: BibleBook[], names: BibleBook[] = [], lang: Lang = "en"): WorkPage[] {
  const named = new Map(names.map((b) => [b.bookCode, b]));
  return books.flatMap((b) =>
    Array.from({ length: b.chapterCount }, (_, i) => {
      const chapter = i + 1;
      const first = `${b.bookName} ${chapter}:1`;
      return {
        key: `${bookSlug(b.bookName)}-${chapter}`,
        division: b.bookOrder,
        subdivision: chapter,
        title: null,
        firstRef: first,
        lastRef: first,
        count: 0,
        readRef: `${b.bookCode} ${chapter}`,
        part: BIBLE_PARTS[lang][b.canon] ?? null,
        book: { code: b.bookCode, name: named.get(b.bookCode)?.bookName ?? b.bookName, title: named.get(b.bookCode)?.fullName ?? b.fullName },
      };
    }),
  );
}

/** Each book once, in order, from the pages of the Bible. */
export function bibleBooks(pages: WorkPage[]): BookRow[] {
  const rows = new Map<string, BookRow>();
  for (const p of pages) {
    if (!p.book) continue;
    const row = rows.get(p.book.code);
    const n = p.subdivision ?? 0;
    if (row) row.numbers.push(n);
    else rows.set(p.book.code, { code: p.book.code, name: p.book.name, title: p.book.title, part: p.part ?? "", base: `${bookSlug(p.book.name)}-`, numbers: [n] });
  }
  return [...rows.values()];
}
