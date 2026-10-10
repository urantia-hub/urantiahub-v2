import type { MetadataRoute } from "next";
import { absoluteUrl, site } from "@/site";

export default function robots(): MetadataRoute.Robots {
  if (!site.indexable) return { rules: { userAgent: "*", disallow: "/" } };
  // A results page is not a page of the text.
  return { rules: { userAgent: "*", allow: "/", disallow: ["/search", "/saved", "/parallels"] }, sitemap: absoluteUrl("/sitemap.xml") };
}
