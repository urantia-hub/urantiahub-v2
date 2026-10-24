import { paperById } from "@/content/paper-index";
import type { Lang } from "@/i18n/lang";
import type { AllSaved } from "./saved-data";

// The Saved list in the language of the page: the text and the paper title of each entry. The account
// keeps references only, so the text is read here. A paragraph whose text did not load keeps the English one.
export async function inLanguage(all: AllSaved, lang: Lang, load: (paperId: string, ref: string) => Promise<string>): Promise<AllSaved> {
  if (lang === "en") return all;
  const entries = await Promise.all(
    all.entries.map(async (entry) => ({
      ...entry,
      paperTitle: paperById(entry.paperId, lang)?.title ?? entry.paperTitle,
      text: await load(entry.paperId, entry.ref).catch(() => entry.text),
    })),
  );
  return { ...all, entries };
}
