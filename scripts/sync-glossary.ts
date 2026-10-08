// Writes src/content/glossary.json from GET /entities. Run with: bun run sync:glossary
// The API gives 100 entries for each request. The requests run one at a time: the API fails under a burst.
import { writeFileSync } from "node:fs";

type Raw = { id: string; name: string; type: string; aliases: string[] | null; description: string | null; seeAlso: string[] | null; citationCount: number };

const base = process.env.URANTIA_API_BASE_URL || "https://api.urantia.dev";
const KINDS = new Set(["being", "place", "order", "race", "religion", "concept"]);
const entries: unknown[] = [];
let pages = 1;
for (let page = 0; page < pages; page++) {
  const res = await fetch(`${base}/entities?limit=100&page=${page}`);
  if (!res.ok) throw new Error(`GET /entities page ${page} failed with ${res.status}`);
  const body = (await res.json()) as { data: Raw[]; meta: { totalPages: number; total: number } };
  pages = body.meta.totalPages;
  for (const e of body.data) {
    if (!KINDS.has(e.type)) throw new Error(`Entry ${e.id} has the unknown type ${e.type}`);
    entries.push({ id: e.id, name: e.name, type: e.type, aliases: e.aliases ?? [], description: e.description ?? "", seeAlso: e.seeAlso ?? [], citations: e.citationCount });
  }
  if (page === pages - 1 && entries.length !== body.meta.total) throw new Error(`Expected ${body.meta.total} entries, got ${entries.length}`);
  await new Promise((resolve) => setTimeout(resolve, 200));
}
if (entries.length < 4000) throw new Error(`Only ${entries.length} entries: the glossary looks cut short`);
// One entry for each line: a change in one entry is one line in a diff.
writeFileSync("src/content/glossary.json", `[\n${entries.map((e) => JSON.stringify(e)).join(",\n")}\n]\n`);
console.log(`Wrote ${entries.length} glossary entries`);
