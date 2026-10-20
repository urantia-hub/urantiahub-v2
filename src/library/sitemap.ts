type Load = () => Promise<{ works: readonly { slug: string }[]; firstKeys: Record<string, string> }>;

// World texts, the page on how it works, the page of each work, and its first page (`firstKeys` leaves out a work of one page), for the sitemap. Nothing while the Library is unlinked, and
// nothing when its list does not load, so the sitemap of the Papers always stands.
export async function libraryPaths(linked: boolean, load: Load): Promise<string[]> {
  if (!linked) return [];
  try {
    const { works, firstKeys } = await load();
    return ["/texts", "/texts/how-it-works", ...works.flatMap((w) => [`/texts/${w.slug}`, ...(firstKeys[w.slug] ? [`/texts/${w.slug}/${firstKeys[w.slug]}`] : [])])];
  } catch {
    return [];
  }
}
