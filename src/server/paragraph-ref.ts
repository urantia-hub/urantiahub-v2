import { ParagraphNotFound } from "@/content/fetchers";
import type { Lang } from "@/i18n/lang";

export type LoadText = (paperId: string, ref: string, lang: Lang) => Promise<string>;

// The exact form of a paragraph reference. Anything else is refused before any work.
const REFERENCE = /^(\d{1,3}):(\d{1,2})\.(\d{1,3})$/;
const LAST_PAPER = 196;

export const refuse = (status: number, error: string) => Response.json({ error }, { status, headers: { "cache-control": "no-store" } });

// The text of one paragraph, or the answer that refuses it. "001:0.1" has the right form, but it is not the
// name of a paragraph: one paragraph has one address, so it never reaches the loader and its cache.
export async function paragraphText(ref: string, loadText: LoadText, lang: Lang): Promise<{ text: string } | { refused: Response }> {
  const parsed = REFERENCE.exec(ref);
  const paperId = parsed ? String(Number(parsed[1])) : "";
  if (!parsed || Number(parsed[1]) > LAST_PAPER || ref !== `${paperId}:${Number(parsed[2])}.${Number(parsed[3])}`) {
    return { refused: refuse(400, "This is not a paragraph reference.") };
  }
  try {
    return { text: await loadText(paperId, ref, lang) };
  } catch (error) {
    return { refused: error instanceof ParagraphNotFound ? refuse(404, "The paper has no such paragraph.") : refuse(502, "The paper did not load.") };
  }
}
