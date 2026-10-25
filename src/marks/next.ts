// The marks nearest to a reader: the 3 with the least time left, each with a line that says what it
// takes. A streak mark counts each day left as one section a day of 5 minutes (Kelson, 2026-10-17).

import { PARTS, paperById } from "@/content/paper-index";
import type { Lang } from "@/i18n/lang";
import { BOOK } from "@/content/section-index";
import { isTextPage, TEXT_WORKS } from "@/content/text-index";
import type { TextPages } from "./earn";
import { MARKS, type Mark } from "./list";

type Row = { paperId: string; sectionId: string; how: "read" | "heard" };
export type NextMark = { id: string; line: string; progress: number | null };

const DAY_MINUTES = 5;
const TOOL_MINUTES: Record<string, number> = { image: 2 };
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// The words of the lines in each language. A world text keeps its English title until the Hub has the catalog.
const WORDS = {
  en: {
    tools: {
      search: "Search for any word",
      parallels: "Open the parallels of a paragraph",
      terms: "Open the terms of a paragraph",
      note: "Save a note on a paragraph",
      image: "Make an image of a paragraph",
      share: "Share a paragraph",
    } as Record<string, string>,
    time: (minutes: number) => (minutes < 60 ? `about ${Math.max(1, Math.round(minutes))} min` : minutes < 90 ? "about 1 hour" : `about ${Math.round(minutes / 60)} hours`),
    finishSection: "Finish one section",
    listenSection: "Listen to one section",
    days: (n: number) => `${plural(n, "day", "days")} left`,
    sections: (n: number) => `${plural(n, "section", "sections")} left`,
    papers: (n: number) => `${plural(n, "paper", "papers")} left`,
    works: (n: number) => `${plural(n, "work", "works")} left`,
    pagesLeft: (left: number, pages: number, unit: string) => `${left} of ${pages} ${unit.endsWith("s") ? unit : `${unit}s`} left`,
    paper: (id: string) => `Paper ${id}`,
  },
  es: {
    tools: {
      search: "Busca cualquier palabra",
      parallels: "Abre los paralelos de un párrafo",
      terms: "Abre los términos de un párrafo",
      note: "Guarda una nota sobre un párrafo",
      image: "Haz una imagen de un párrafo",
      share: "Comparte un párrafo",
    } as Record<string, string>,
    time: (minutes: number) => (minutes < 1.5 ? "1 min" : minutes < 60 ? `unos ${Math.round(minutes)} min` : minutes < 90 ? "cerca de 1 hora" : `unas ${Math.round(minutes / 60)} horas`),
    finishSection: "Termina una sección",
    listenSection: "Escucha una sección",
    days: (n: number) => `${n === 1 ? "Queda" : "Quedan"} ${plural(n, "día", "días")}`,
    sections: (n: number) => `${n === 1 ? "queda" : "quedan"} ${plural(n, "sección", "secciones")}`,
    papers: (n: number) => `${n === 1 ? "Queda" : "Quedan"} ${plural(n, "documento", "documentos")}`,
    works: (n: number) => `${n === 1 ? "Queda" : "Quedan"} ${plural(n, "obra", "obras")}`,
    pagesLeft: (left: number, pages: number, unit: string) => `${left === 1 ? "queda" : "quedan"} ${left} de ${pages} ${UNITS_ES[unit] ?? unit}`,
    paper: (id: string) => `Documento ${id}`,
  },
};
const UNITS_ES: Record<string, string> = { book: "libros", chapter: "capítulos", collection: "colecciones", composition: "composiciones", hymn: "himnos", part: "partes", poem: "poemas", section: "secciones", surah: "suras", upanishad: "upanishads" };
type Words = (typeof WORDS)["en"];

export function timeWords(minutes: number, lang: Lang = "en"): string {
  return WORDS[lang].time(minutes);
}

// The minutes left in each paper, from the sections that the reader did not finish.
function minutesLeft(rows: readonly Row[]): Map<string, { minutes: number; sections: number }> {
  const done = new Set(rows.map((row) => `${row.paperId}:${row.sectionId}`));
  const left = new Map<string, { minutes: number; sections: number }>();
  for (const entry of BOOK) {
    const of = left.get(entry.paperId) ?? { minutes: 0, sections: 0 };
    if (!done.has(`${entry.paperId}:${entry.id}`)) {
      of.minutes += entry.words / 100;
      of.sections += 1;
    }
    left.set(entry.paperId, of);
  }
  return left;
}

// The world texts that the reader did not finish: the minutes and the pages left in each, the shortest first.
type WorkLeft = { title: string; unit: string; pages: number; left: number; minutes: number };
function worksLeft(texts: TextPages): { open: WorkLeft[]; finished: number } {
  const open: WorkLeft[] = [];
  for (const work of TEXT_WORKS) {
    const done = new Set((texts[work.slug] ?? []).filter((key) => isTextPage(work.slug, key)));
    const rest = work.pages.filter((page) => !done.has(page.key));
    if (rest.length > 0) open.push({ title: work.title, unit: work.unit, pages: work.pages.length, left: rest.length, minutes: rest.reduce((n, page) => n + page.words / 100, 0) });
  }
  return { open: open.sort((a, b) => a.minutes - b.minutes), finished: TEXT_WORKS.length - open.length };
}
const startedText = (texts: TextPages) => Object.entries(texts).some(([slug, keys]) => keys.some((key) => isTextPage(slug, key)));

type Reach = { minutes: number; line: string; progress: number | null };

function reachText(rule: { kind: "texts"; count: number | "all" }, texts: TextPages, w: Words): Reach {
  const { open, finished } = worksLeft(texts);
  const target = rule.count === "all" ? TEXT_WORKS.length : rule.count;
  // One whole work names a work that the reader started, when there is one.
  const started = open.filter((work) => work.left < work.pages);
  const chosen = (target === 1 && started.length > 0 ? started : open).slice(0, target - finished);
  const minutes = chosen.reduce((sum, work) => sum + work.minutes, 0);
  const one = chosen.length === 1 ? chosen[0] : null;
  if (one) {
    // A work that the reader started names its pages left; a work of one page, or one not started, its time.
    const started = one.left < one.pages;
    const line = started ? `${one.title} · ${w.pagesLeft(one.left, one.pages, one.unit)} · ${w.time(minutes)}` : `${one.title} · ${w.time(minutes)}`;
    return { minutes, line, progress: target === 1 ? (one.pages - one.left) / one.pages : finished / target };
  }
  return { minutes, line: `${w.works(chosen.length)} · ${w.time(minutes)}`, progress: finished / target };
}

function reach(mark: Mark, rows: readonly Row[], left: ReturnType<typeof minutesLeft>, current: number, nextMinutes: number, texts: TextPages, lang: Lang): Reach {
  const rule = mark.rule;
  const w = WORDS[lang];
  if (rule.kind === "texts") return reachText(rule, texts, w);
  if (rule.kind === "first-text") return { minutes: 0, line: "", progress: null };
  if (rule.kind === "first-section") return { minutes: nextMinutes, line: `${w.finishSection} · ${w.time(nextMinutes)}`, progress: null };
  if (rule.kind === "first-listen") return { minutes: nextMinutes, line: `${w.listenSection} · ${w.time(nextMinutes)}`, progress: null };
  if (rule.kind === "tool") {
    const minutes = TOOL_MINUTES[mark.id] ?? 1;
    return { minutes, line: `${w.tools[mark.id]} · ${minutes} min`, progress: null };
  }
  if (rule.kind === "streak") {
    const days = Math.max(1, rule.days - current);
    return { minutes: days * DAY_MINUTES, line: w.days(days), progress: current / rule.days };
  }
  if (rule.kind === "papers") {
    const open = [...left].filter(([, of]) => of.sections > 0).sort((a, b) => a[1].minutes - b[1].minutes);
    const finished = left.size - open.length;
    const need = rule.count - finished;
    const chosen = open.slice(0, need);
    const minutes = chosen.reduce((sum, [, of]) => sum + of.minutes, 0);
    if (need === 1 && chosen[0]) {
      const [paperId, of] = chosen[0];
      const title = paperById(paperId, lang)?.title ?? w.paper(paperId);
      return { minutes, line: `${title} · ${w.sections(of.sections)} · ${w.time(minutes)}`, progress: finished / rule.count };
    }
    return { minutes, line: `${w.papers(need)} · ${w.time(minutes)}`, progress: finished / rule.count };
  }
  const part = PARTS.find((p) => p.id === rule.partId);
  const papers = part?.papers ?? [];
  const open = papers.filter((paper) => (left.get(paper.id)?.sections ?? 0) > 0);
  const minutes = open.reduce((sum, paper) => sum + (left.get(paper.id)?.minutes ?? 0), 0);
  const sectionsLeft = w.sections(left.get(papers[0]?.id)?.sections ?? 0);
  const line = papers.length === 1 ? `${lang === "es" ? sectionsLeft[0].toUpperCase() + sectionsLeft.slice(1) : sectionsLeft} · ${w.time(minutes)}` : `${w.papers(open.length)} · ${w.time(minutes)}`;
  return { minutes, line, progress: papers.length > 1 ? (papers.length - open.length) / papers.length : null };
}

export function nextMarks(input: { rows: readonly Row[]; current: number; earned: Record<string, string>; nextMinutes: number; texts?: TextPages }, count = 3, lang: Lang = "en"): NextMark[] {
  const left = minutesLeft(input.rows);
  const nextMinutes = input.nextMinutes;
  // The world-text marks wait until the reader starts a world text: a short page would push the Papers out.
  const texts = startedText(input.texts ?? {});
  return MARKS.filter((mark) => !input.earned[mark.id] && (texts || (mark.rule.kind !== "texts" && mark.rule.kind !== "first-text")))
    .map((mark, order) => ({ mark, order, ...reach(mark, input.rows, left, input.current, nextMinutes, input.texts ?? {}, lang) }))
    .sort((a, b) => a.minutes - b.minutes || a.order - b.order)
    .slice(0, count)
    .map(({ mark, line, progress }) => ({ id: mark.id, line, progress: progress && progress > 0 ? progress : null }));
}
