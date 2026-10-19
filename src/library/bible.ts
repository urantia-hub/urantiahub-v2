import type { WorkPage } from "@/content/library";

// The Bible in World texts: one page for each chapter, from the list of its books. A page is read by the book
// code ("DanGr 3"), and its verses are named by the book name ("Daniel (Greek) 3:5").
export const BIBLE = "bible";

export type BibleBook = { bookCode: string; bookName: string; bookOrder: number; canon: string; chapterCount: number };

const PARTS: Record<string, string> = { ot: "Old Testament", deuterocanon: "Deuterocanon", nt: "New Testament" };

/** "Daniel (Greek)" gives "daniel-greek": the book in the address of its chapters. */
export const bookSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** One page for each chapter, in the order of the books. The count of verses is not known before a read: 0. */
export function biblePages(books: BibleBook[]): WorkPage[] {
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
        part: PARTS[b.canon] ?? null,
        book: b.bookCode,
      };
    }),
  );
}
