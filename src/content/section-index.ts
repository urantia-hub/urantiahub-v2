import raw from "./section-index.json";
import titlesEs from "./section-titles.es.json";
import { paperById } from "./paper-index";

// Each section of the book, for the streak: its title, its count of paragraphs, and its count of words.
// Server code only: the file is about 60 KB. Section 0 is the text of a paper before its first title.
export type SectionEntry = { paperId: string; id: string; title: string | null; paragraphs: number; words: number };

type Row = [string, string | null, number, number];
const papers = raw.papers as unknown as Record<string, Row[]>;

// The whole book in reading order: the Foreword, then Papers 1 to 196.
export const BOOK: readonly SectionEntry[] = Array.from({ length: 197 }, (_, n) =>
  (papers[String(n)] ?? []).map(([id, title, paragraphs, words]) => ({ paperId: String(n), id, title, paragraphs, words })),
).flat();

export const TOTAL_SECTIONS = BOOK.length;

const place = new Map(BOOK.map((entry, i) => [`${entry.paperId}:${entry.id}`, i]));

export function sectionAt(paperId: string, sectionId: string): SectionEntry | undefined {
  const i = place.get(`${paperId}:${sectionId}`);
  return i === undefined ? undefined : BOOK[i];
}

// The section after this one. After the last section of Paper 196 the book starts again.
export function nextAfter(paperId: string, sectionId: string): SectionEntry {
  const i = place.get(`${paperId}:${sectionId}`);
  return BOOK[i === undefined ? 0 : (i + 1) % BOOK.length];
}

// The order of a section in the book, for a comparison of two places.
export const orderOf = (paperId: string, sectionId: string): number => place.get(`${paperId}:${sectionId}`) ?? -1;

// The English title of each section of a paper, by its number. A Spanish page keeps the place in English.
export function titlesOf(paperId: string): Record<string, string | null> {
  return Object.fromEntries((papers[paperId] ?? []).map(([id, title]) => [id, title]));
}

// The title of a section in a language, or null for the opening of a paper.
export function sectionTitleIn(paperId: string, sectionId: string, lang: "en" | "es"): string | null {
  if (lang === "en") return sectionAt(paperId, sectionId)?.title ?? null;
  return (titlesEs.papers as Record<string, (string | null)[]>)[paperId]?.[Number(sectionId)] ?? null;
}

// Minutes at a study pace of 100 words a minute.
export const minutesOf = (words: number): number => Math.max(1, Math.ceil(words / 100));

// What a reader sees: the title of the section first, then the title of its paper. A section 0 has no
// title of its own, so it shows the title of the paper and "The opening".
export function sectionLabel(entry: SectionEntry): { title: string; paper: string } {
  const paper = paperById(entry.paperId)?.title ?? "";
  return entry.title ? { title: entry.title, paper } : { title: paper, paper: "The opening" };
}
