import { getLibrary, getWorkPage, getWorkPages } from "@/content";
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
  if (!page) return new Response(null, { status: 307, headers: { location: `/library/${slug}/${pages[0].key}` } });
  // A range ("BG 7.22-24") lands on its first passage; a number inside a joined passage ("Dhp 26") on that passage.
  const start = ref.replace(/-\d+$/, "");
  const passages = await getWorkPage(slug, page.key);
  const passage = passages.find((p) => p.ref === ref) ?? passages.find((p) => p.ref === start) ?? passages.find((p) => p.ref.startsWith(`${start}-`));
  // Encoded, so a letter outside ASCII ("Skáldskaparmál") reaches the browser whole. WorkNav decodes the hash.
  const to = `/library/${slug}/${page.key}${passage ? `#${encodeURIComponent(refId(passage.ref))}` : ""}`;
  return new Response(null, { status: 307, headers: { location: to } });
}
