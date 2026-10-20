import "server-only";
import { getParagraphText, ParagraphNotFound } from "@/content";
import { paperById, paperPath } from "@/content/paper-index";
import { units } from "@/image/compose";
import { isCode, parseUnitCode, refForLink, refFromLink, unitCode, unitWords } from "@/reader/share-link";

export type Shared = {
  ref: string;
  paperTitle: string;
  // The words that the link shows, from the API.
  words: string;
  // The address of this link, and the place in the paper that it opens.
  path: string;
  target: string;
};

// What a shared link names. `go` is the one right address of a link in another form, and null is a link
// to a paragraph that the Papers do not have.
export async function sharedPassage(refPart: string, pickPart?: string): Promise<Shared | { go: string } | null> {
  // The form with a colon arrives with its escape.
  const ref = refFromLink(refPart.replace(/%3A/i, ":"));
  const paper = ref ? paperById(ref.split(":")[0]) : undefined;
  // A part that is not a code is no link of one paragraph: a pair has three parts or more.
  if (!ref || !paper || (pickPart !== undefined && !isCode(pickPart))) return null;
  let text: string;
  try {
    text = await getParagraphText(paper.id, ref);
  } catch (error) {
    if (error instanceof ParagraphNotFound) return null;
    throw error;
  }
  const whole = `/s/${refForLink(ref)}`;
  const all = units(text);
  const chosen = pickPart === undefined ? new Set<number>() : parseUnitCode(pickPart, all);
  // A choice that this paragraph does not have: the link is for the whole paragraph.
  if (!chosen) return { go: whole };
  const code = unitCode(chosen, all);
  const path = code ? `${whole}/${code}` : whole;
  if (refForLink(ref) !== refPart) return { go: path };
  return { ref, paperTitle: paper.title, words: unitWords(text, chosen), path, target: `${paperPath(paper.id)}${code ? `?s=${code}` : ""}#${ref}` };
}
