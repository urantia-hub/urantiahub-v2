import { anchorFor, slugify, type ParsedReference } from "@/lib/paper-url";
import raw from "./paper-index.json";
import rawEs from "./paper-index.es.json";

// `sections`: the count of numbered sections of the paper. `paragraphs`: the count of its paragraphs.
export type PaperEntry = { id: string; title: string; partId: string; slug: string; sections: number; paragraphs: number };
export type PartEntry = { id: string; title: string; sponsorship: string | null; papers: PaperEntry[] };

function buildParts(source: typeof raw, lang: "en" | "es"): PartEntry[] {
  return source.parts.map((part) => ({
    id: part.id,
    title: part.title,
    sponsorship: part.sponsorship,
    papers: part.papers.map((paper) => ({
      id: paper.id,
      title: paper.title,
      partId: part.id,
      sections: paper.sections,
      paragraphs: paper.paragraphs,
      slug: slugify(paper.id, paper.title, lang),
    })),
  }));
}

function byId(parts: PartEntry[]): PaperEntry[] {
  return parts.flatMap((part) => part.papers).sort((a, b) => Number(a.id) - Number(b.id));
}

export const PARTS: PartEntry[] = buildParts(raw, "en");

// PAPERS[n] is paper n. The Foreword is paper 0.
export const PAPERS: PaperEntry[] = byId(PARTS);

// The same index with the Spanish titles and slugs.
export const PARTS_ES: PartEntry[] = buildParts(rawEs, "es");
export const PAPERS_ES: PaperEntry[] = byId(PARTS_ES);

export const PAPERS_BY_LANG: Record<"en" | "es", PaperEntry[]> = { en: PAPERS, es: PAPERS_ES };
export const PARTS_BY_LANG: Record<"en" | "es", PartEntry[]> = { en: PARTS, es: PARTS_ES };

export function paperById(id: string, lang: "en" | "es" = "en"): PaperEntry | undefined {
  return /^\d{1,3}$/.test(id) ? PAPERS_BY_LANG[lang][Number(id)] : undefined;
}

export function paperPath(id: string, lang: "en" | "es" = "en"): string {
  const paper = paperById(id, lang);
  if (!paper) throw new Error(`Unknown paper id: ${id}`);
  return lang === "es" ? `/es/documentos/${paper.slug}` : `/papers/${paper.slug}`;
}

export function referenceHref(ref: ParsedReference, lang: "en" | "es" = "en"): string {
  return `${paperPath(ref.paperId, lang)}${anchorFor(ref)}`;
}

const NUMERALS: Record<string, string> = { "1": "I", "2": "II", "3": "III", "4": "IV" };

export function partNumeral(partId: string): string {
  return NUMERALS[partId] ?? "";
}
