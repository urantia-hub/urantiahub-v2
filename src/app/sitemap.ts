import type { MetadataRoute } from "next";
import { PAPERS, paperPath } from "@/content/paper-index";
import { absoluteUrl } from "@/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const fixed = ["/", "/papers", "/about", "/privacy"];
  return [...fixed, ...PAPERS.map((paper) => paperPath(paper.id))].map((path) => ({ url: absoluteUrl(path) }));
}
