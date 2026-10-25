import type { LibraryWork, WorkPage } from "@/content/library";
import type { Lang } from "@/i18n/lang";
import { pageReadRef, unitNumber } from "./refs";

type Work = Pick<LibraryWork, "title" | "refLevels" | "divisionLabel">;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const shortTitle = (title: string) => title.replace(/\s*\(.*\)/, "");
// The titles name the pages only when each page has its own (the Dhammapada, the Shu King).
const ownTitles = (pages: WorkPage[]) => pages.every((p) => p.title) && new Set(pages.map((p) => p.title)).size === pages.length;

/** The line above the title of a page, and the title. */
export function pageLabels(work: Work, page: WorkPage, pages: WorkPage[]): { eyebrow: string; title: string } {
  // A chapter of the Bible: "The Bible · New Testament" above "John 3".
  if (page.part) return { eyebrow: `${shortTitle(work.title)} · ${page.part}`, title: page.book ? `${page.book.name} ${page.subdivision}` : page.firstRef.replace(/:\d+$/, "") };
  const division = `${cap(work.divisionLabel)} ${page.division}`;
  if (ownTitles(pages)) return { eyebrow: `${shortTitle(work.title)} · ${division}`, title: page.title as string };
  if (work.refLevels === 3) {
    // A title that all pages carry (each chapter of "1 Nephi") stands above the reference.
    const above = pages.every((p) => p.title) ? (page.title as string) : division;
    return { eyebrow: `${shortTitle(work.title)} · ${above}`, title: pageReadRef(3, page) };
  }
  return { eyebrow: shortTitle(work.title), title: page.title ?? division };
}

/** The plural of a label: "verse" → "verses", "sección" → "secciones". A label that ends in "s" names a range and stays. */
export function plural(word: string, lang: Lang = "en"): string {
  if (word.endsWith("s")) return word;
  return lang === "es" && word.endsWith("ión") ? `${word.slice(0, -3)}iones` : `${word}s`;
}

/** "12 verses", "1 verse", "88 lines". */
export function unitCount(count: number, unitLabel: string, lang: Lang = "en"): string {
  return `${count} ${count === 1 ? unitLabel : plural(unitLabel, lang)}`;
}

/** A row of the chapters list. The number shows only when the title does not already name the page. */
export function chapterRow(work: Work, page: WorkPage, pages: WorkPage[]): { number: string | null; title: string } {
  const { title } = pageLabels(work, page, pages);
  if (work.refLevels !== 3) return { number: String(page.division), title };
  const ref = pageReadRef(3, page);
  return title === ref ? { number: null, title } : { number: unitNumber(ref), title };
}
