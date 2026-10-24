// Writes src/content/section-titles.es.json: for each paper, the Spanish title of each section by its
// number, from GET /papers/{id}/sections?lang=es. Run with: bun run sync:sections-es
import { writeFileSync } from "node:fs";

type Section = { sectionId: string; title: string | null };

const base = process.env.URANTIA_API_BASE_URL || "https://api.urantia.dev";

async function sections(id: number): Promise<Section[]> {
  for (let attempt = 0; ; attempt++) {
    const answer = await fetch(`${base}/papers/${id}/sections?lang=es`);
    if (answer.ok) return ((await answer.json()) as { data: Section[] }).data;
    if (attempt === 2) throw new Error(`GET /papers/${id}/sections failed with ${answer.status}`);
  }
}

// The title at the place of its section number. Section 0, and a number with no section (139:9), have none.
const papers: Record<string, (string | null)[]> = {};
let count = 0;
// Four at a time: the API answers 500 under a burst.
for (let i = 0; i < 197; i += 4) {
  const ids = Array.from({ length: Math.min(4, 197 - i) }, (_, k) => i + k);
  const answers = await Promise.all(ids.map(sections));
  answers.forEach((rows, k) => {
    const titles: (string | null)[] = [];
    for (const row of rows) titles[Number(row.sectionId)] = row.title;
    count += rows.length;
    papers[String(ids[k])] = Array.from(titles, (title) => title ?? null);
  });
}

if (Object.keys(papers).length !== 197) throw new Error("Expected 197 papers");
if (count !== 1626) throw new Error(`Expected 1626 sections, got ${count}`);

writeFileSync("src/content/section-titles.es.json", `${JSON.stringify({ papers })}\n`);
console.log(`Wrote ${count} sections`);
