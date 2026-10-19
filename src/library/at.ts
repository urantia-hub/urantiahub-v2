import { getLibrary, getWorkPages } from "@/content";
import { pageOfRef, refId } from "./refs";

// "In the Library" links to /library/{work}/at/{ref}: the page that holds the passage, at the passage.
// A passage that it cannot place goes to the first page of the work; a work that the Library lacks is a 404.
export async function handleLibraryAt({ work: slug, ref: raw }: { work: string; ref: string }): Promise<Response> {
  const work = (await getLibrary()).find((w) => w.slug === slug);
  if (!work) return new Response("Not found", { status: 404 });
  let ref = raw;
  try {
    ref = decodeURIComponent(raw);
  } catch {
    // A bad "%" code: the reference stays as it came, and no page holds it.
  }
  const pages = await getWorkPages(slug);
  const page = pageOfRef(work.refLevels, pages, ref);
  const to = page ? `/library/${slug}/${page.key}#${refId(ref)}` : `/library/${slug}/${pages[0].key}`;
  return new Response(null, { status: 307, headers: { location: to } });
}
