import type { MetadataRoute } from "next";
import { getLibrary, getWorkPages } from "@/content";
import { PAPERS, paperPath } from "@/content/paper-index";
import { spanishOn } from "@/i18n/lang";
import { fixedPages } from "@/i18n/paths";
import { LIBRARY_LINKS } from "@/library/flags";
import { libraryLoad, libraryPaths } from "@/library/sitemap";
import { absoluteUrl } from "@/site";

const loadLibrary = libraryLoad(() => getLibrary(), (slug) => getWorkPages(slug));

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const library = await libraryPaths(LIBRARY_LINKS, loadLibrary);
  const spanish = spanishOn() ? [...fixedPages("es"), ...PAPERS.map((paper) => paperPath(paper.id, "es")), ...(await libraryPaths(LIBRARY_LINKS, loadLibrary, "es"))] : [];
  return [...fixedPages("en"), ...PAPERS.map((paper) => paperPath(paper.id)), ...library, ...spanish].map((path) => ({ url: absoluteUrl(path) }));
}
