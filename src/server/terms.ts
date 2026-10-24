import { isName, kindLabel, type GlossaryEntry } from "@/glossary/glossary";
import { termsIn } from "@/glossary/match";
import type { Lang } from "@/i18n/lang";
import { type LoadText, paragraphText } from "./paragraph-ref";

export type Term = { id: string; name: string; kind: string; description: string; aliases: string[]; seeAlso: string[]; citations: number };
export type TermsAnswer = { names: Term[]; ideas: Term[] };

const toTerm = (entry: GlossaryEntry, lang: Lang): Term => ({
  id: entry.id,
  name: entry.name,
  kind: kindLabel(entry.type, lang),
  description: entry.description,
  aliases: entry.aliases,
  seeAlso: entry.seeAlso,
  citations: entry.citations,
});

// The glossary terms that stand in one paragraph: names first, then ideas, each in the order of the text.
// Each term carries its description, so the reader opens an entry with no second request. In Spanish the text,
// the glossary, and the kinds are Spanish.
export async function handleTerms(ref: string, loadText: LoadText, lang: Lang = "en"): Promise<Response> {
  const loaded = await paragraphText(ref, loadText, lang);
  if ("refused" in loaded) return loaded.refused;
  const found = termsIn(loaded.text, lang);
  const term = (entry: GlossaryEntry) => toTerm(entry, lang);
  const answer: TermsAnswer = { names: found.filter(isName).map(term), ideas: found.filter((e) => !isName(e)).map(term) };
  // The text and the glossary change rarely, so a shared cache can keep the answer for a day.
  return Response.json(answer, { headers: { "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } });
}
