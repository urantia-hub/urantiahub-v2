import type { PaperDoc } from "@/content/fetchers";
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
export async function handleTerms(ref: string, loadPaper: (id: string) => Promise<PaperDoc>): Promise<Response> {
  const parsed = REFERENCE.exec(ref);
  if (!parsed || Number(parsed[1]) > LAST_PAPER) return refuse(400, "This is not a paragraph reference.");

  let paper: PaperDoc;
  try {
    paper = await loadPaper(String(Number(parsed[1])));
  } catch {
    return refuse(502, "The paper did not load.");
  }
  const paragraph = paper.sections.flatMap((section) => section.paragraphs).find((p) => p.ref === ref);
  if (!paragraph) return refuse(404, "The paper has no such paragraph.");

  const found = termsIn(paragraph.text);
  const answer: TermsAnswer = { names: found.filter(isName).map(toTerm), ideas: found.filter((e) => !isName(e)).map(toTerm) };
  // The text and the glossary change rarely, so a shared cache can keep the answer for a day.
  return Response.json(answer, { headers: { "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } });
}
