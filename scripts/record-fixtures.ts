// Records live API responses for the browser tests. Run with: bun run record:fixtures
import { mkdirSync, writeFileSync } from "node:fs";
import { HOME_PASSAGES } from "../src/content/passages";

const base = "https://api.urantia.dev";
const paths = [
  ...["0", "1", "2", "99"].map((id) => `/papers/${id}`),
  ...[...new Set(HOME_PASSAGES.map((passage) => passage.ref))].map((ref) => `/paragraphs/${ref}`),
];

mkdirSync("e2e/fixtures", { recursive: true });
for (const path of paths) {
  const res = await fetch(`${base}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed with ${res.status}`);
  const file = `e2e/fixtures/${path.slice(1).replace(/[/:]/g, "_")}.json`;
  writeFileSync(file, `${JSON.stringify(await res.json())}\n`);
  console.log(`recorded ${path} -> ${file}`);
}

// Search responses. The fixture server pages and limits them itself, so one large record serves each request.
const slug = (q: string) => q.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
for (const q of ["thought adjuster", "what happens after death"]) {
  for (const [name, path, body] of [
    ["search", "/search", { q, type: "and", page: 0, limit: 50 }],
    ["semantic", "/search/semantic", { q, limit: 10 }],
  ] as const) {
    const res = await fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`POST ${path} for "${q}" failed with ${res.status}`);
    const file = `e2e/fixtures/${name}_${slug(q)}.json`;
    writeFileSync(file, `${JSON.stringify(await res.json())}\n`);
    console.log(`recorded ${path} "${q}" -> ${file}`);
  }
}
