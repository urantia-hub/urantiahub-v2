// Writes src/content/glossary.json from GET /entities. Run with: bun run sync:glossary
// With --lang=es it writes src/content/glossary.es.json from GET /entities?lang=es: only the entries that the
// API gives in Spanish, and no idea in its everyday sense. It needs the English file, for "see also".
// The API gives 100 entries for each request. The requests run one at a time: the API fails under a burst.
import { readFileSync, writeFileSync } from "node:fs";

type Raw = {
  id: string;
  name: string;
  type: string;
  aliases: string[] | null;
  description: string | null;
  seeAlso: string[] | null;
  citationCount: number;
  sense: "special" | "ordinary" | null;
  language?: string;
};
type Entry = { id: string; name: string; type: string; aliases: string[]; description: string; seeAlso: string[]; citations: number; sense?: "special" | "ordinary" };

const spanish = process.argv.includes("--lang=es");
const base = process.env.URANTIA_API_BASE_URL || "https://api.urantia.dev";
const KINDS = new Set(["being", "place", "order", "race", "religion", "concept"]);
const entries: Entry[] = [];
let total = 0;
let skipped = 0;
let pages = 1;
for (let page = 0; page < pages; page++) {
  const res = await fetch(`${base}/entities?limit=100&page=${page}${spanish ? "&lang=es" : ""}`);
  if (!res.ok) throw new Error(`GET /entities page ${page} failed with ${res.status}`);
  const body = (await res.json()) as { data: Raw[]; meta: { totalPages: number; total: number } };
  pages = body.meta.totalPages;
  total = body.meta.total;
  for (const e of body.data) {
    if (!KINDS.has(e.type)) throw new Error(`Entry ${e.id} has the unknown type ${e.type}`);
    if (spanish && (e.language !== "es" || e.sense === "ordinary")) {
      skipped += 1;
      continue;
    }
    entries.push({ id: e.id, name: e.name, type: e.type, aliases: e.aliases ?? [], description: e.description ?? "", seeAlso: e.seeAlso ?? [], citations: e.citationCount, ...(e.sense ? { sense: e.sense } : {}) });
  }
  if (page === pages - 1 && entries.length + skipped !== total) throw new Error(`Expected ${total} entries, got ${entries.length + skipped}`);
  await new Promise((resolve) => setTimeout(resolve, 200));
}

if (spanish) {
  // "See also" names English entries. Each becomes the name of its Spanish entry, or goes when there is none.
  const english = JSON.parse(readFileSync("src/content/glossary.json", "utf8")) as Entry[];
  const idOf = new Map(english.map((e) => [e.name, e.id]));
  const nameOf = new Map(entries.map((e) => [e.id, e.name]));
  for (const e of entries) e.seeAlso = e.seeAlso.flatMap((name) => nameOf.get(idOf.get(name) ?? "") ?? []);
  const described = entries.filter((e) => e.description !== "").length;
  if (described < 2500) throw new Error(`Only ${described} entries have a Spanish description: the glossary looks cut short`);
} else if (entries.length < 4000) {
  throw new Error(`Only ${entries.length} entries: the glossary looks cut short`);
}
// One entry for each line: a change in one entry is one line in a diff.
const file = spanish ? "src/content/glossary.es.json" : "src/content/glossary.json";
writeFileSync(file, `[\n${entries.map((e) => JSON.stringify(e)).join(",\n")}\n]\n`);
console.log(`Wrote ${entries.length} glossary entries to ${file}`);
