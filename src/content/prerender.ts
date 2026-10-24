import { spanishOn } from "@/i18n/lang";
import { PAPERS } from "./paper-index";

// The papers to build ahead of time. PRERENDER_PAPERS limits the list (e2e and previews use it).
export function prerenderIds(): string[] {
  const only = process.env.PRERENDER_PAPERS?.split(",").map((s) => s.trim()).filter(Boolean);
  return only && only.length > 0 ? only : PAPERS.map((p) => p.id);
}

// Cache Components needs one entry. With the Spanish flag off, that one page answers 404.
export function spanishPrerenderIds(): string[] {
  return spanishOn() ? prerenderIds() : ["0"];
}
