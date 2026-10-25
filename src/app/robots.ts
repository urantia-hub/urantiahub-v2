import type { MetadataRoute } from "next";
import { absoluteUrl, site } from "@/site";

export default function robots(): MetadataRoute.Robots {
  if (!site.indexable) return { rules: { userAgent: "*", disallow: "/" } };
  // A results page is not a page of the text.
  return { rules: { userAgent: "*", allow: "/", disallow: ["/search", "/es/buscar", "/saved", "/es/guardados", "/parallels", "/es/paralelos", "/progress", "/notifications", "/es/avisos", "/you", "/es/tu"] }, sitemap: absoluteUrl("/sitemap.xml") };
}
