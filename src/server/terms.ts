import { ParagraphNotFound } from "@/content/fetchers";
import { isName, KIND_LABEL, type GlossaryEntry } from "@/glossary/glossary";
import { termsIn } from "@/glossary/match";

export type Term = { id: string; name: string; kind: string; description: string; aliases: string[]; seeAlso: string[]; citations: number };
export type TermsAnswer = { names: Term[]; ideas: Term[] };

// The exact form of a paragraph reference. Anything else is refused before any work.
const REFERENCE = /^(\d{1,3}):(\d{1,2})\.(\d{1,3})$/;
const LAST_PAPER = 196;

const toTerm = (entry: GlossaryEntry): Term => ({
  id: entry.id,
  name: entry.name,
  kind: KIND_LABEL[entry.type],
  description: entry.description,
  aliases: entry.aliases,
  seeAlso: entry.seeAlso,
  citations: entry.citations,
});

const refuse = (status: number, error: string) => Response.json({ error }, { status, headers: { "cache-control": "no-store" } });

// The glossary terms that stand in one paragraph: names first, then ideas, each in the order of the text.
// Each term carries its description, so the reader opens an entry with no second request.
export async function handleTerms(ref: string, loadText: (paperId: string, ref: string) => Promise<string>): Promise<Response> {
  const parsed = REFERENCE.exec(ref);
  if (!parsed || Number(parsed[1]) > LAST_PAPER) return refuse(400, "This is not a paragraph reference.");
  // "001:0.1" has the right form, but it is not the name of a paragraph. One paragraph has one address.
  const paperId = String(Number(parsed[1]));
  if (ref !== `${paperId}:${Number(parsed[2])}.${Number(parsed[3])}`) return refuse(400, "This is not a paragraph reference.");

  let text: string;
  try {
    text = await loadText(paperId, ref);
  } catch (error) {
    return error instanceof ParagraphNotFound ? refuse(404, "The paper has no such paragraph.") : refuse(502, "The paper did not load.");
  }

  const found = termsIn(text);
  const answer: TermsAnswer = { names: found.filter(isName).map(toTerm), ideas: found.filter((e) => !isName(e)).map(toTerm) };
  // The text and the glossary change rarely, so a shared cache can keep the answer for a day.
  return Response.json(answer, { headers: { "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } });
}
