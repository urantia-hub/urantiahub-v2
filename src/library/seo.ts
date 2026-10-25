import type { LibraryWork } from "@/content/library";
import type { Lang } from "@/i18n/lang";
import type { WorkContents } from "./contents";

/** The title of the page of a work in a search result: "The Dhammapada (F. Max Muller, 1881): all 26 chapters". */
// Spanish has no article before the count: its gender follows the word ("los capítulos", "las suras").
export function workHeadline(work: Pick<LibraryWork, "title" | "byline">, facts: string[], kind: WorkContents["kind"], lang: Lang = "en"): string {
  const name = work.title.includes("(") ? work.title : `${work.title} (${work.byline})`;
  if (kind === "single") return name;
  return lang === "es" ? `${name}: ${facts[0]}` : `${name}: all ${facts[0]}`;
}
