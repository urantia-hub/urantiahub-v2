import { anchorFor, slugify, type ParsedReference } from "@/lib/paper-url";
import raw from "./paper-index.json";

export type PaperEntry = { id: string; title: string; partId: string; slug: string };
export type PartEntry = { id: string; title: string; sponsorship: string | null; papers: PaperEntry[] };

export const PARTS: PartEntry[] = raw.parts.map((part) => ({
  id: part.id,
  title: part.title,
  sponsorship: part.sponsorship,
  papers: part.papers.map((paper) => ({
    id: paper.id,
    title: paper.title,
    partId: part.id,
    slug: slugify(paper.id, paper.title),
  })),
}));

// PAPERS[n] is paper n. The Foreword is paper 0.
export const PAPERS: PaperEntry[] = PARTS.flatMap((part) => part.papers).sort((a, b) => Number(a.id) - Number(b.id));

export function paperById(id: string): PaperEntry | undefined {
  return /^\d{1,3}$/.test(id) ? PAPERS[Number(id)] : undefined;
}

export function paperPath(id: string): string {
  const paper = paperById(id);
  if (!paper) throw new Error(`Unknown paper id: ${id}`);
  return `/papers/${paper.slug}`;
}

export function referenceHref(ref: ParsedReference): string {
  return `${paperPath(ref.paperId)}${anchorFor(ref)}`;
}

const NUMERALS: Record<string, string> = { "1": "I", "2": "II", "3": "III", "4": "IV" };

export function partNumeral(partId: string): string {
  return NUMERALS[partId] ?? "";
}
