import { getLibrary, getWorkPage, getWorkPages } from "@/content";
import { passageText } from "@/pair/passage";
import { isCode } from "@/reader/share-link";
import { pageOfRef } from "./refs";

// "Read here" links to /texts/{work}/at/{ref}: the page that holds the passage, at the passage.
// A passage that it cannot place goes to the first page of the work; a work that the Library lacks is a 404.
// A pair link adds `?s=`, the chosen units: they go on, with `n`, the count of passages of a range.
export async function handleLibraryAt({ work: slug, ref: raw, search = "" }: { work: string; ref: string; search?: string }): Promise<Response> {
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
  // The text of a work of one page is on the page of the work.
  const pageHref = (key: string) => (pages.length === 1 ? `/texts/${slug}` : `/texts/${slug}/${key}`);
  if (!page) return new Response(null, { status: 307, headers: { location: pageHref(pages[0].key) } });
  // A range ("BG 7.22-24") lands on its first passage; a number inside a joined passage ("Dhp 26") on that passage.
  const found = passageText(ref, await getWorkPage(slug, page.key));
  const code = new URLSearchParams(search).get("s") ?? "";
  const query = found && isCode(code) ? `?s=${code}${found.ids.length > 1 ? `&n=${found.ids.length}` : ""}` : "";
  // Encoded, so a letter outside ASCII ("Skáldskaparmál") reaches the browser whole. WorkNav decodes the hash.
  const to = `${pageHref(page.key)}${query}${found ? `#${encodeURIComponent(found.ids[0])}` : ""}`;
  return new Response(null, { status: 307, headers: { location: to } });
}
