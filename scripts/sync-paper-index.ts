// Writes src/content/paper-index.json from GET /toc. Run with: bun run sync:index
import { writeFileSync } from "node:fs";

type TocPart = { id: string; title: string; sponsorship: string | null; papers: { id: string; title: string }[] };

const base = process.env.URANTIA_API_BASE_URL || "https://api.urantia.dev";
const res = await fetch(`${base}/toc`);
if (!res.ok) throw new Error(`GET /toc failed with ${res.status}`);
const { data } = (await res.json()) as { data: { parts: TocPart[] } };

const parts = data.parts.map((part) => ({
  id: part.id,
  title: part.title,
  sponsorship: part.sponsorship,
  papers: part.papers.map((paper) => ({ id: paper.id, title: paper.title })),
}));
const count = parts.reduce((n, part) => n + part.papers.length, 0);
if (count !== 197) throw new Error(`Expected 197 papers, got ${count}`);

writeFileSync("src/content/paper-index.json", `${JSON.stringify({ parts }, null, 2)}\n`);
console.log(`Wrote ${count} papers in ${parts.length} parts`);
