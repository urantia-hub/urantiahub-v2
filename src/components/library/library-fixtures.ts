import { readFileSync } from "node:fs";
import { pageKey, unitNumber } from "@/library/refs";
import type { LibraryWork, WorkPage, WorkPassage } from "@/content/library";

// The recorded answers of the API, in the shapes of the content gateway, for the tests of the Library.
const read = (name: string) => JSON.parse(readFileSync(`e2e/fixtures/library/${name}.json`, "utf8")).data;

export const DHAMMAPADA: LibraryWork = {
  slug: "dhammapada",
  corpusId: "dhammapada-muller-1881",
  title: "The Dhammapada",
  tradition: "Buddhist",
  kind: "scripture",
  summary: "A collection of the Buddha's sayings in verse.",
  translator: "F. Max Muller",
  year: 1881,
  refPrefix: "Dhp",
  refLevels: 1,
  divisionLabel: "chapter",
  unitLabel: "verse",
};

export function dhammapadaPages(): WorkPage[] {
  return read("scriptures_dhammapada").pages.map((p: { division: number; subdivision: number | null; title: string | null; firstRef: string; lastRef: string; passageCount: number }) => ({
    key: pageKey(p.division, p.subdivision),
    division: p.division,
    subdivision: p.subdivision,
    title: p.title,
    firstRef: p.firstRef,
    lastRef: p.lastRef,
    count: p.passageCount,
  }));
}

export function dhammapadaPage2(): WorkPassage[] {
  return read("works_dhammapada_Dhp-21-32").map((p: { reference: string; text: string; url: string | null }) => ({ ref: p.reference, number: unitNumber(p.reference), text: p.text, url: p.url }));
}
