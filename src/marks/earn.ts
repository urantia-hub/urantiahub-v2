// Which marks a reader holds: each one that the rows and the streak earn, and each tool mark that the
// account keeps. A mark, once earned, stays with its first time.

import { BOOK } from "@/content/section-index";
import { PARTS } from "@/content/paper-index";
import { MARKS, type Mark } from "./list";

type Row = { paperId: string; sectionId: string; how: "read" | "heard" };

// The count of sections of each paper.
const sectionsOf = new Map<string, number>();
for (const entry of BOOK) sectionsOf.set(entry.paperId, (sectionsOf.get(entry.paperId) ?? 0) + 1);

// The papers with each section finished, as in the whole-book count.
export function finishedPapers(rows: readonly Row[]): Set<string> {
  const done = new Map<string, Set<string>>();
  for (const row of rows) {
    const of = done.get(row.paperId) ?? new Set<string>();
    of.add(row.sectionId);
    done.set(row.paperId, of);
  }
  return new Set([...done].filter(([paperId, ids]) => ids.size >= (sectionsOf.get(paperId) ?? Infinity)).map(([paperId]) => paperId));
}

function holds(mark: Mark, rows: readonly Row[], papers: Set<string>, longest: number): boolean {
  const rule = mark.rule;
  if (rule.kind === "first-section") return rows.length > 0;
  if (rule.kind === "first-listen") return rows.some((row) => row.how === "heard");
  if (rule.kind === "papers") return papers.size >= rule.count;
  if (rule.kind === "part") return PARTS.find((part) => part.id === rule.partId)?.papers.every((paper) => papers.has(paper.id)) ?? false;
  if (rule.kind === "streak") return longest >= rule.days;
  return false;
}

// The marks that the rows and the longest streak earn now.
export function earnedMarks(rows: readonly Row[], longest: number): string[] {
  const papers = finishedPapers(rows);
  return MARKS.filter((mark) => holds(mark, rows, papers, longest)).map((mark) => mark.id);
}

// The stored marks with the new ones added. The earliest time of each id stays.
export function mergeMarks(stored: Record<string, string>, ids: readonly string[], at: string): { marks: Record<string, string>; fresh: string[] } {
  const marks = { ...stored };
  const fresh: string[] = [];
  for (const id of ids) {
    if (marks[id]) continue;
    marks[id] = at;
    fresh.push(id);
  }
  return { marks, fresh };
}
