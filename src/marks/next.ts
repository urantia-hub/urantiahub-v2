// The marks nearest to a reader: the 3 with the least time left, each with a line that says what it
// takes. A streak mark counts each day left as one section a day of 5 minutes (Kelson, 2026-10-17).

import { PARTS, paperById } from "@/content/paper-index";
import { BOOK } from "@/content/section-index";
import { MARKS, type Mark } from "./list";

type Row = { paperId: string; sectionId: string; how: "read" | "heard" };
export type NextMark = { id: string; line: string; progress: number | null };

const DAY_MINUTES = 5;
const TOOL_LINES: Record<string, string> = {
  search: "Search for any word",
  parallels: "Open the parallels of a paragraph",
  terms: "Open the terms of a paragraph",
  note: "Save a note on a paragraph",
  image: "Make an image of a paragraph",
  share: "Share a paragraph",
};
const TOOL_MINUTES: Record<string, number> = { image: 2 };

export function timeWords(minutes: number): string {
  if (minutes < 60) return `about ${Math.max(1, Math.round(minutes))} min`;
  if (minutes < 90) return "about 1 hour";
  return `about ${Math.round(minutes / 60)} hours`;
}
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

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

type Reach = { minutes: number; line: string; progress: number | null };

function reach(mark: Mark, rows: readonly Row[], left: ReturnType<typeof minutesLeft>, current: number, nextMinutes: number): Reach {
  const rule = mark.rule;
  if (rule.kind === "first-section") return { minutes: nextMinutes, line: `Finish one section · ${timeWords(nextMinutes)}`, progress: null };
  if (rule.kind === "first-listen") return { minutes: nextMinutes, line: `Listen to one section · ${timeWords(nextMinutes)}`, progress: null };
  if (rule.kind === "tool") {
    const minutes = TOOL_MINUTES[mark.id] ?? 1;
    return { minutes, line: `${TOOL_LINES[mark.id]} · ${minutes} min`, progress: null };
  }
  if (rule.kind === "streak") {
    const days = Math.max(1, rule.days - current);
    return { minutes: days * DAY_MINUTES, line: `${plural(days, "day", "days")} left`, progress: current / rule.days };
  }
  if (rule.kind === "papers") {
    const open = [...left].filter(([, of]) => of.sections > 0).sort((a, b) => a[1].minutes - b[1].minutes);
    const finished = left.size - open.length;
    const need = rule.count - finished;
    const chosen = open.slice(0, need);
    const minutes = chosen.reduce((sum, [, of]) => sum + of.minutes, 0);
    if (need === 1 && chosen[0]) {
      const [paperId, of] = chosen[0];
      const title = paperById(paperId)?.title ?? `Paper ${paperId}`;
      return { minutes, line: `${title} · ${plural(of.sections, "section", "sections")} left · ${timeWords(minutes)}`, progress: finished / rule.count };
    }
    return { minutes, line: `${plural(need, "paper", "papers")} left · ${timeWords(minutes)}`, progress: finished / rule.count };
  }
  const part = PARTS.find((p) => p.id === rule.partId);
  const papers = part?.papers ?? [];
  const open = papers.filter((paper) => (left.get(paper.id)?.sections ?? 0) > 0);
  const minutes = open.reduce((sum, paper) => sum + (left.get(paper.id)?.minutes ?? 0), 0);
  const line = papers.length === 1 ? `${plural(left.get(papers[0].id)?.sections ?? 0, "section", "sections")} left · ${timeWords(minutes)}` : `${plural(open.length, "paper", "papers")} left · ${timeWords(minutes)}`;
  return { minutes, line, progress: papers.length > 1 ? (papers.length - open.length) / papers.length : null };
}

export function nextMarks(input: { rows: readonly Row[]; current: number; earned: Record<string, string>; nextMinutes: number }, count = 3): NextMark[] {
  const left = minutesLeft(input.rows);
  const nextMinutes = input.nextMinutes;
  return MARKS.filter((mark) => !input.earned[mark.id])
    .map((mark, order) => ({ mark, order, ...reach(mark, input.rows, left, input.current, nextMinutes) }))
    .sort((a, b) => a.minutes - b.minutes || a.order - b.order)
    .slice(0, count)
    .map(({ mark, line, progress }) => ({ id: mark.id, line, progress: progress && progress > 0 ? progress : null }));
}
