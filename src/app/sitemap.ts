import type { MetadataRoute } from "next";
import { getLibrary, getWorkPages } from "@/content";
import { PAPERS, paperPath } from "@/content/paper-index";
import { LIBRARY_LINKS } from "@/library/flags";
import { libraryPaths } from "@/library/sitemap";
import { absoluteUrl } from "@/site";

async function loadLibrary() {
  const works = await getLibrary();
  const firstKeys = Object.fromEntries(await Promise.all(works.map(async (w) => [w.slug, (await getWorkPages(w.slug))[0]?.key ?? ""] as const)));
  return { works, firstKeys };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixed = ["/", "/papers", "/about", "/resources", "/releases", "/privacy", "/terms"];
  const library = await libraryPaths(LIBRARY_LINKS, loadLibrary);
  return [...fixed, ...PAPERS.map((paper) => paperPath(paper.id)), ...library].map((path) => ({ url: absoluteUrl(path) }));
}
