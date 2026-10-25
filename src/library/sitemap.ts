import type { Lang } from "@/i18n/lang";
import { howHref, textsHref } from "@/i18n/paths";

type Load = () => Promise<{ works: readonly { slug: string }[]; firstKeys: Record<string, string> }>;

// The works and the first page of each, from a list of works and the pages of one work. A work of one page redirects its page to
// the page of the work, so it has no first page here.
export function libraryLoad(works: () => Promise<readonly { slug: string }[]>, pagesOf: (slug: string) => Promise<readonly { key: string }[]>): Load {
  return async () => {
    const list = await works();
    const firstKeys = Object.fromEntries(await Promise.all(list.map(async (w) => [w.slug, await pagesOf(w.slug).then((pages) => (pages.length > 1 ? pages[0].key : ""))] as const)));
    return { works: list, firstKeys };
  };
}

// World texts, the page on how it works, the page of each work, and its first page (`firstKeys` leaves out a work of one page), for the sitemap. Nothing while the Library is unlinked, and
// nothing when its list does not load, so the sitemap of the Papers always stands.
// The Spanish twins have the same slugs and keys under `/es/textos`.
export async function libraryPaths(linked: boolean, load: Load, lang: Lang = "en"): Promise<string[]> {
  if (!linked) return [];
  try {
    const { works, firstKeys } = await load();
    return [textsHref(lang), howHref(lang), ...works.flatMap((w) => [textsHref(lang, w.slug), ...(firstKeys[w.slug] ? [textsHref(lang, w.slug, firstKeys[w.slug])] : [])])];
  } catch {
    return [];
  }
}
