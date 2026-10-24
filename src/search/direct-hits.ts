import { PAPERS_BY_LANG, paperById, paperPath, referenceHref } from "@/content/paper-index";
import type { Lang } from "@/i18n/lang";
import { parseReference } from "@/lib/paper-url";
import { startsLikeQuestion } from "./query";

export type DirectHit = { kind: "reference" | "paper"; href: string; title: string; detail: string };

// Words that are in almost every title. Alone, they say nothing about which paper the reader wants.
const SMALL = new Set(["the", "of", "and", "in", "to", "on", "at", "for", "by", "an", "el", "la", "los", "las", "de", "del", "y", "en", "a", "al", "un", "una", "su", "sus"]);
const MAX_PAPERS = 4;

const WORDS = {
  en: { goTo: (point: string) => `Go to ${point}`, foreword: "Go to the Foreword", paper: (id: string) => `Go to Paper ${id}`, papers: "The Urantia Papers", named: (id: string) => `Paper ${id}` },
  es: { goTo: (point: string) => `Ir a ${point}`, foreword: "Ir al Prólogo", paper: (id: string) => `Ir al Documento ${id}`, papers: "Los Documentos de Urantia", named: (id: string) => `Documento ${id}` },
} as const;

// A Spanish title matches with or without its accents.
const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// What the typed text names directly: a reference, or papers by title. No request is needed.
export function directHits(text: string, lang: Lang = "en"): DirectHit[] {
  const w = WORDS[lang];
  const ref = parseReference(text);
  if (ref) {
    const paper = paperById(ref.paperId, lang);
    if (!paper) return [];
    const point =
      ref.sectionId === undefined ? null : `${ref.paperId}:${ref.sectionId}${ref.paragraphId === undefined ? "" : `.${ref.paragraphId}`}`;
    const title = point ? w.goTo(point) : paper.id === "0" ? w.foreword : w.paper(paper.id);
    const detail = paper.id === "0" ? w.papers : `${w.named(paper.id)} · ${paper.title}`;
    return [{ kind: "reference", href: referenceHref(ref, lang), title, detail }];
  }

  const trimmed = text.trim().replace(/\s+/g, " ");
  // A question is for the search, not for a title match. A long text can still be a full title.
  if (trimmed === "" || startsLikeQuestion(trimmed)) return [];
  const words = fold(trimmed)
    .split(" ")
    .filter((word) => word.length > 1 && !SMALL.has(word));
  if (words.length === 0) return [];

  const hits: DirectHit[] = [];
  for (const paper of PAPERS_BY_LANG[lang]) {
    const titleWords = fold(paper.title).split(/[^\p{L}\p{N}’']+/u);
    if (!words.every((word) => titleWords.some((titleWord) => titleWord.startsWith(word)))) continue;
    hits.push({ kind: "paper", href: paperPath(paper.id, lang), title: paper.title, detail: paper.id === "0" ? w.papers : w.named(paper.id) });
    if (hits.length === MAX_PAPERS) break;
  }
  return hits;
}
