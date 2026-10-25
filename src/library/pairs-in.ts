import type { WorkPair } from "@/content/library";
import { paperById } from "@/content/paper-index";
import type { Lang } from "@/i18n/lang";

// The pairs of a work in the language of the page: the paragraph of the Papers in that language, and the
// title of its paper. The passage of the work stays English. A paragraph that fails keeps its English text.
export async function pairsIn(pairs: WorkPair[], lang: Lang, text: (paperId: string, ref: string) => Promise<string>): Promise<WorkPair[]> {
  if (lang === "en") return pairs;
  return Promise.all(
    pairs.map(async (pair) => {
      try {
        const words = await text(pair.paragraph.paperId, pair.paragraph.ref);
        return { ...pair, paragraph: { ...pair.paragraph, text: words, paperTitle: paperById(pair.paragraph.paperId, lang)?.title ?? pair.paragraph.paperTitle } };
      } catch {
        return pair;
      }
    }),
  );
}
