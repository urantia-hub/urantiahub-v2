import entries from "@/content/glossary.json";
import entriesEs from "@/content/glossary.es.json";
import type { Lang } from "@/i18n/lang";

export type Kind = "being" | "place" | "order" | "race" | "religion" | "concept";
export type GlossaryEntry = {
  id: string;
  name: string;
  type: Kind;
  aliases: string[];
  description: string;
  seeAlso: string[];
  citations: number;
  // For a lowercase idea: "special" is a term of the Papers, "ordinary" is a word in its everyday sense.
  sense?: "special" | "ordinary";
};

// The glossary of urantia.dev, written by `bun run sync:glossary`. The text of each entry is theirs.
export const GLOSSARY = entries as readonly GlossaryEntry[];
// The entries that the API gives in Spanish, written by `bun run sync:glossary --lang=es`.
export const GLOSSARY_BY_LANG: Record<Lang, readonly GlossaryEntry[]> = { en: GLOSSARY, es: entriesEs as readonly GlossaryEntry[] };

const KIND_LABELS: Record<Lang, Record<Kind, string>> = {
  en: { being: "Being", place: "Place", order: "Order of beings", race: "Race", religion: "Religion", concept: "Idea" },
  es: { being: "Ser", place: "Lugar", order: "Orden de seres", race: "Raza", religion: "Religión", concept: "Idea" },
};
export const KIND_LABEL = KIND_LABELS.en;
export const kindLabel = (type: Kind, lang: Lang = "en") => KIND_LABELS[lang][type];

// A name is a being, a place, an order, a race, or a religion. The rest are ideas.
export function isName(entry: GlossaryEntry): boolean {
  return entry.type !== "concept";
}
