import type { MetadataRoute } from "next";
import { getLibrary, getWorkPages } from "@/content";
import { PAPERS, paperPath } from "@/content/paper-index";
import { spanishOn } from "@/i18n/lang";
import { LIBRARY_LINKS } from "@/library/flags";
import { libraryPaths } from "@/library/sitemap";
import { absoluteUrl } from "@/site";

async function loadLibrary() {
  const works = await getLibrary();
  // A work of one page redirects its page to the page of the work, so it has no first page here.
  const firstKeys = Object.fromEntries(
    await Promise.all(
      works.map(async (w) => {
        const pages = await getWorkPages(w.slug);
        return [w.slug, pages.length > 1 ? pages[0].key : ""] as const;
      }),
    ),
  );
  return { works, firstKeys };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixed = ["/", "/papers", "/about", "/resources", "/releases", "/privacy", "/terms"];
  const library = await libraryPaths(LIBRARY_LINKS, loadLibrary);
  const spanish = spanishOn() ? ["/es", "/es/documentos", ...PAPERS.map((paper) => paperPath(paper.id, "es"))] : [];
  return [...fixed, ...PAPERS.map((paper) => paperPath(paper.id)), ...library, ...spanish].map((path) => ({ url: absoluteUrl(path) }));
}
