import { PAPERS, paperById, paperPath, referenceHref } from "@/content/paper-index";
import { parseReference } from "@/lib/paper-url";
import { startsLikeQuestion } from "./query";

export type DirectHit = { kind: "reference" | "paper"; href: string; title: string; detail: string };

// Words that are in almost every title. Alone, they say nothing about which paper the reader wants.
const SMALL = new Set(["the", "of", "and", "in", "to", "on", "at", "for", "by", "an"]);
const MAX_PAPERS = 4;

// What the typed text names directly: a reference, or papers by title. No request is needed.
export function directHits(text: string): DirectHit[] {
  const ref = parseReference(text);
  if (ref) {
    const paper = paperById(ref.paperId);
    if (!paper) return [];
    const point =
      ref.sectionId === undefined ? null : `${ref.paperId}:${ref.sectionId}${ref.paragraphId === undefined ? "" : `.${ref.paragraphId}`}`;
    const title = point ? `Go to ${point}` : paper.id === "0" ? "Go to the Foreword" : `Go to Paper ${paper.id}`;
    const detail = paper.id === "0" ? "The Urantia Papers" : `Paper ${paper.id} · ${paper.title}`;
    return [{ kind: "reference", href: referenceHref(ref), title, detail }];
  }

  const trimmed = text.trim().replace(/\s+/g, " ");
  // A question is for the search, not for a title match. A long text can still be a full title.
  if (trimmed === "" || startsLikeQuestion(trimmed)) return [];
  const words = trimmed
    .toLowerCase()
    .split(" ")
    .filter((word) => word.length > 1 && !SMALL.has(word));
  if (words.length === 0) return [];

  const hits: DirectHit[] = [];
  for (const paper of PAPERS) {
    const titleWords = paper.title.toLowerCase().split(/[^a-z0-9’']+/);
    if (!words.every((word) => titleWords.some((titleWord) => titleWord.startsWith(word)))) continue;
    hits.push({ kind: "paper", href: paperPath(paper.id), title: paper.title, detail: paper.id === "0" ? "The Urantia Papers" : `Paper ${paper.id}` });
    if (hits.length === MAX_PAPERS) break;
  }
  return hits;
}
