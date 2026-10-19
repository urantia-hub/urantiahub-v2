import type { LibraryWork } from "@/content/library";
import type { WorkContents } from "./contents";

/** The title of the page of a work in a search result: "The Dhammapada (F. Max Muller, 1881): all 26 chapters". */
export function workHeadline(work: Pick<LibraryWork, "title" | "byline">, facts: string[], kind: WorkContents["kind"]): string {
  const name = work.title.includes("(") ? work.title : `${work.title} (${work.byline})`;
  return kind === "single" ? name : `${name}: all ${facts[0]}`;
}
