// Writes src/content/section-index.json: for each paper, each section with its title, its count of
// paragraphs, and its count of words, from GET /papers/{id}. Run with: bun run sync:sections
import { writeFileSync } from "node:fs";

type Paragraph = { sectionId: string; sectionTitle: string | null; text: string };

const base = process.env.URANTIA_API_BASE_URL || "https://api.urantia.dev";

async function paper(id: number): Promise<Paragraph[]> {
  for (let attempt = 0; ; attempt++) {
    const answer = await fetch(`${base}/papers/${id}`);
    if (answer.ok) return ((await answer.json()) as { data: { paragraphs: Paragraph[] } }).data.paragraphs;
    if (attempt === 2) throw new Error(`GET /papers/${id} failed with ${answer.status}`);
  }
}

// [sectionId, title, paragraphs, words] for each section, in the order of the paper.
type Row = [string, string | null, number, number];
const papers: Record<string, Row[]> = {};
// Four at a time: the API answers 500 under a burst.
for (let i = 0; i < 197; i += 4) {
  const ids = Array.from({ length: Math.min(4, 197 - i) }, (_, k) => i + k);
  const answers = await Promise.all(ids.map(paper));
  answers.forEach((paragraphs, k) => {
    const rows: Row[] = [];
    for (const p of paragraphs) {
      let row = rows.at(-1);
      if (!row || row[0] !== p.sectionId) {
        row = [p.sectionId, p.sectionTitle, 0, 0];
        rows.push(row);
      }
      row[2] += 1;
      row[3] += p.text.split(/\s+/).filter(Boolean).length;
    }
    papers[String(ids[k])] = rows;
  });
}

const count = Object.values(papers).reduce((n, rows) => n + rows.length, 0);
if (Object.keys(papers).length !== 197) throw new Error("Expected 197 papers");
if (count !== 1626) throw new Error(`Expected 1626 sections, got ${count}`);

writeFileSync("src/content/section-index.json", `${JSON.stringify({ papers })}\n`);
console.log(`Wrote ${count} sections`);
