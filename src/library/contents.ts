import type { LibraryWork, WorkPage } from "@/content/library";
import { BIBLE, bibleBooks, type BookRow } from "./bible";
import { GROUPED, NUMBERED, workBooks } from "./books";
import { type Lang, numberIn } from "@/i18n/lang";
import { chapterRow, plural as pluralOf, unitCount } from "./labels";
import { unitNumber } from "./refs";

export type ContentsRow = { key: string; number: string | null; title: string; line: string };
/** The contents of a work, in the form that fits it: titles, numbers, books, or none for a work of one page. */
export type WorkContents =
  | { kind: "single" }
  | { kind: "list"; rows: ContentsRow[] }
  | { kind: "grid"; rows: ContentsRow[] }
  | { kind: "books"; unit: string; parts: { part: string; books: BookRow[] }[] };

type Work = Pick<LibraryWork, "slug" | "title" | "refLevels" | "refPrefix" | "divisionLabel" | "unitLabel" | "units">;

const plural = (count: number, word: string, lang: Lang) => `${numberIn(lang)(count)} ${count === 1 ? word : pluralOf(word, lang)}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// "Verses 21–32" where the numbers run through the whole work; else "12 verses".
function rowLine(work: Work, page: WorkPage, lang: Lang): string {
  if (work.refLevels !== 1) return unitCount(page.count, work.unitLabel, lang);
  const first = unitNumber(page.firstRef).split("-")[0];
  const last = unitNumber(page.lastRef).split("-").pop() as string;
  if (first === last) return `${cap(work.unitLabel)} ${first}`;
  return `${cap(pluralOf(work.unitLabel, lang))} ${first}–${last}`;
}

export function workContents(work: Work, pages: WorkPage[], lang: Lang = "en"): WorkContents {
  if (pages.length === 1) return { kind: "single" };
  if (work.slug === BIBLE || GROUPED[work.slug]) {
    const books = work.slug === BIBLE ? bibleBooks(pages) : workBooks(work, pages);
    const parts = books.map((b) => b.part).filter((p, i, all) => all.indexOf(p) === i);
    return { kind: "books", unit: GROUPED[work.slug] ?? "chapter", parts: parts.map((part) => ({ part, books: books.filter((b) => b.part === part) })) };
  }
  const rows = pages.map((p) => ({ key: p.key, ...chapterRow(work, p, pages), line: rowLine(work, p, lang) }));
  return NUMBERED.has(work.slug) ? { kind: "grid", rows } : { kind: "list", rows };
}

/** The counts on the line under the title: "26 chapters", "414 verses". A unit that is a range ("lines") has no count. */
export function workFacts(work: Work, contents: WorkContents, lang: Lang = "en"): string[] {
  const facts: string[] = [];
  const book = lang === "es" ? "libro" : "book";
  if (contents.kind === "books") facts.push(plural(contents.parts.reduce((n, p) => n + p.books.length, 0), work.slug === BIBLE ? book : work.divisionLabel, lang));
  else if (contents.kind !== "single") facts.push(plural(contents.rows.length, work.divisionLabel, lang));
  if (work.units && !work.unitLabel.endsWith("s")) facts.push(plural(work.units, work.unitLabel, lang));
  return facts;
}
