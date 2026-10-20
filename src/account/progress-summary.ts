// What the Progress page shows, from the count of read paragraphs of each paper.

import { PAPERS, PARTS, partNumeral } from "@/content/paper-index";

// A paper counts as read at nine of ten paragraphs: the rule for one paragraph needs time in view, and
// a reader skims a short paragraph now and then. All of them would mean that few papers ever count.
export const READ_SHARE = 0.9;
const NEXT_MAX = 5;

export type PaperProgress = { id: string; title: string; percent: number };
export type PartProgress = { id: string; name: string; title: string | null; percent: number };
export type Summary = {
  read: number;
  total: number;
  percent: number;
  finished: number;
  started: number;
  untouched: number;
  parts: PartProgress[];
  next: PaperProgress[];
};

// A whole percent. It is 0 only for nothing, and 100 only for all.
export function percent(read: number, total: number): number {
  if (read <= 0 || total <= 0) return 0;
  if (read >= total) return 100;
  return Math.min(99, Math.max(1, Math.round((read / total) * 100)));
}

export function summarize(counts: Record<string, number>, placePaper: string | null): Summary {
  const readOf = (id: string, total: number) => {
    const count = counts[id];
    return typeof count === "number" && count > 0 ? Math.min(Math.floor(count), total) : 0;
  };
  const sum = (papers: { id: string; paragraphs: number }[]) =>
    papers.reduce((n, paper) => ({ read: n.read + readOf(paper.id, paper.paragraphs), total: n.total + paper.paragraphs }), { read: 0, total: 0 });

  const whole = sum(PAPERS);
  const done = (paper: { id: string; paragraphs: number }) => readOf(paper.id, paper.paragraphs) / paper.paragraphs >= READ_SHARE;
  const finished = PAPERS.filter(done).length;
  const open = PAPERS.filter((paper) => readOf(paper.id, paper.paragraphs) > 0 && !done(paper));
  const share = (paper: { id: string; paragraphs: number }) => readOf(paper.id, paper.paragraphs) / paper.paragraphs;
  const next = [...open]
    .sort((a, b) => Number(b.id === placePaper) - Number(a.id === placePaper) || share(b) - share(a) || Number(a.id) - Number(b.id))
    .slice(0, NEXT_MAX)
    .map((paper) => ({ id: paper.id, title: paper.title, percent: percent(readOf(paper.id, paper.paragraphs), paper.paragraphs) }));

  return {
    ...whole,
    percent: percent(whole.read, whole.total),
    finished,
    started: open.length,
    untouched: PAPERS.length - finished - open.length,
    parts: PARTS.map((part) => {
      const of = sum(part.papers);
      return { ...partLabel(part), percent: percent(of.read, of.total) };
    }),
    next,
  };
}

// The name of a part as the progress shows it: "Part I" with its title, or the Foreword by its title.
export function partLabel(part: { id: string; title: string }): { id: string; name: string; title: string | null } {
  const numeral = partNumeral(part.id);
  return { id: part.id, name: numeral ? `Part ${numeral}` : part.title, title: numeral ? part.title : null };
}
