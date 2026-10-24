import { useEffect, useState } from "react";
import { sectionLabel } from "@/components/navigation/nav-state";
import type { Lang } from "@/i18n/lang";
import type { LastRead } from "./last-read";

type Titles = Record<string, (string | null)[]>;

let titlesEs: Titles | null = null;
let loading: Promise<Titles> | null = null;

// The Spanish titles of the sections. The file is 47 KB, so it loads only when a Spanish page names a place.
function loadTitlesEs(): Promise<Titles> {
  loading ??= import("@/content/section-titles.es.json").then(
    (file) => (titlesEs = file.default.papers as Titles),
    (error: unknown) => {
      loading = null;
      throw error;
    },
  );
  return loading;
}

// The title of the section of a place, in the language of the page. The stored label is English: it
// goes to the account and to the place email. A Spanish page reads its title from the section number.
export function usePlaceLabel(place: LastRead | null, lang: Lang): string | null {
  const [, setLoaded] = useState(false);
  const wanted = lang === "es" && place !== null && place.sectionId !== "0" && titlesEs === null;
  useEffect(() => {
    if (!wanted) return;
    let current = true;
    loadTitlesEs().then(
      () => current && setLoaded(true),
      // With no titles, the card names the paper only.
      () => undefined,
    );
    return () => {
      current = false;
    };
  }, [wanted]);
  if (!place) return null;
  if (lang === "en") return place.label;
  const title = place.sectionId === "0" ? null : titlesEs?.[place.paperId]?.[Number(place.sectionId)];
  return title ? sectionLabel({ id: place.sectionId, title }, "es") : null;
}
