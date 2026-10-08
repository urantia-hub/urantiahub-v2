import entries from "@/content/glossary.json";

export type Kind = "being" | "place" | "order" | "race" | "religion" | "concept";
export type GlossaryEntry = {
  id: string;
  name: string;
  type: Kind;
  aliases: string[];
  description: string;
  seeAlso: string[];
  citations: number;
};

// The glossary of urantia.dev, written by `bun run sync:glossary`. The text of each entry is theirs.
export const GLOSSARY = entries as readonly GlossaryEntry[];

export const KIND_LABEL: Record<Kind, string> = {
  being: "Being",
  place: "Place",
  order: "Order of beings",
  race: "Race",
  religion: "Religion",
  concept: "Idea",
};

// A name is a being, a place, an order, a race, or a religion. The rest are ideas.
export function isName(entry: GlossaryEntry): boolean {
  return entry.type !== "concept";
}
