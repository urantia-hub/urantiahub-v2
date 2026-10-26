import { paperById } from "@/content/paper-index";
import type { Lang } from "@/i18n/lang";
import type { AllSaved } from "./saved-data";

// After a deploy no paper is stored, and the API fails when it gets every paper of a long list at once.
const PAPERS_AT_ONCE = 6;
// The list must come back inside the time of the request (RUN_LIMIT_MS in handlers.ts).
const BUDGET_MS = 5000;

// The Saved list in the language of the page: the text and the paper title of each entry. The account
// keeps references only, so the text is read here. A paragraph whose text did not load in time keeps the English one.
export async function inLanguage(
  all: AllSaved,
  lang: Lang,
  load: (paperId: string, ref: string) => Promise<string>,
  { budgetMs = BUDGET_MS }: { budgetMs?: number } = {},
): Promise<AllSaved> {
  if (lang === "en") return all;
  const texts = new Map<string, string>();
  const refsOf = new Map<string, string[]>();
  for (const { paperId, ref } of all.entries) refsOf.set(paperId, [...(refsOf.get(paperId) ?? []), ref]);
  const papers = [...refsOf.keys()];
  const keep = (ref: string, text: string | null) => text !== null && texts.set(ref, text);
  const tryLoad = (paperId: string, ref: string) => load(paperId, ref).catch(() => null);

  // One request for each paper first, so that the other paragraphs of the paper come from the store.
  async function worker() {
    for (let paperId = papers.shift(); paperId !== undefined; paperId = papers.shift()) {
      const [first, ...rest] = refsOf.get(paperId) ?? [];
      keep(first, await tryLoad(paperId, first));
      await Promise.all(rest.map(async (ref) => keep(ref, await tryLoad(paperId, ref))));
    }
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    Promise.all(Array.from({ length: Math.min(PAPERS_AT_ONCE, papers.length) }, worker)),
    new Promise((resolve) => (timer = setTimeout(resolve, budgetMs))),
  ]);
  clearTimeout(timer);
  papers.length = 0;

  const entries = all.entries.map((entry) => ({
    ...entry,
    paperTitle: paperById(entry.paperId, lang)?.title ?? entry.paperTitle,
    text: texts.get(entry.ref) ?? entry.text,
  }));
  return { ...all, entries };
}
