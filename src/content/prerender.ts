import { PAPERS } from "./paper-index";

// The papers to build ahead of time. PRERENDER_PAPERS limits the list (e2e and previews use it).
export function prerenderIds(): string[] {
  const only = process.env.PRERENDER_PAPERS?.split(",").map((s) => s.trim()).filter(Boolean);
  return only && only.length > 0 ? only : PAPERS.map((p) => p.id);
}
