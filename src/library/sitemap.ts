type Load = () => Promise<{ works: readonly { slug: string }[]; firstKeys: Record<string, string> }>;

// The Library and the first page of each work, for the sitemap. Nothing while the Library is unlinked, and
// nothing when its list does not load, so the sitemap of the Papers always stands.
export async function libraryPaths(linked: boolean, load: Load): Promise<string[]> {
  if (!linked) return [];
  try {
    const { works, firstKeys } = await load();
    return ["/texts", ...works.flatMap((w) => (firstKeys[w.slug] ? [`/texts/${w.slug}/${firstKeys[w.slug]}`] : []))];
  } catch {
    return [];
  }
}
