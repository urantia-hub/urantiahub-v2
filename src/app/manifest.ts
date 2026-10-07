import type { MetadataRoute } from "next";
import { BRAND_PAPER } from "@/brand/BookmarkMark";
import { site } from "@/site";

// Lets a reader put the Hub on a phone's home screen with the bookmark icon.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.name,
    description: "Read and study the Urantia Papers.",
    start_url: "/",
    display: "standalone",
    background_color: BRAND_PAPER,
    theme_color: BRAND_PAPER,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
