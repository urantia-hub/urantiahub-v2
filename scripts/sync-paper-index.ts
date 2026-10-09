// Writes src/content/paper-index.json from GET /toc, with the count of sections of each paper from
// GET /papers/{id}/sections. Run with: bun run sync:index
import { writeFileSync } from "node:fs";

type TocPart = { id: string; title: string; sponsorship: string | null; papers: { id: string; title: string }[] };

const base = process.env.URANTIA_API_BASE_URL || "https://api.urantia.dev";
const res = await fetch(`${base}/toc`);
if (!res.ok) throw new Error(`GET /toc failed with ${res.status}`);
const { data } = (await res.json()) as { data: { parts: TocPart[] } };

// The numbered sections of a paper. Section 0 is the text before the first title, and does not count.
async function sectionCount(paperId: string): Promise<number> {
  for (let attempt = 0; ; attempt++) {
    const answer = await fetch(`${base}/papers/${paperId}/sections`);
    if (answer.ok) {
      const body = (await answer.json()) as { data: { sectionId: string }[] };
      return body.data.filter((section) => section.sectionId !== "0").length;
    }
    if (attempt === 2) throw new Error(`GET /papers/${paperId}/sections failed with ${answer.status}`);
  }
}

// Four at a time: the API answers 500 under a burst.
const ids = data.parts.flatMap((part) => part.papers.map((paper) => paper.id));
const sections = new Map<string, number>();
for (let i = 0; i < ids.length; i += 4) {
  const group = ids.slice(i, i + 4);
  (await Promise.all(group.map(sectionCount))).forEach((n, k) => sections.set(group[k], n));
}

const parts = data.parts.map((part) => ({
  id: part.id,
  title: part.title,
  sponsorship: part.sponsorship,
  papers: part.papers.map((paper) => ({ id: paper.id, title: paper.title, sections: sections.get(paper.id) ?? 0 })),
}));
const count = parts.reduce((n, part) => n + part.papers.length, 0);
if (count !== 197) throw new Error(`Expected 197 papers, got ${count}`);

writeFileSync("src/content/paper-index.json", `${JSON.stringify({ parts }, null, 2)}\n`);
console.log(`Wrote ${count} papers in ${parts.length} parts`);
