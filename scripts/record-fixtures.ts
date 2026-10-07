// Records live API responses for the browser tests. Run with: bun run record:fixtures
import { mkdirSync, writeFileSync } from "node:fs";
import { HOME_PASSAGES } from "../src/content/passages";

const base = "https://api.urantia.dev";
const paths = [
  ...["0", "1", "2", "99"].map((id) => `/papers/${id}`),
  ...HOME_PASSAGES.map((ref) => `/paragraphs/${ref}`),
];

mkdirSync("e2e/fixtures", { recursive: true });
for (const path of paths) {
  const res = await fetch(`${base}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed with ${res.status}`);
  const file = `e2e/fixtures/${path.slice(1).replace(/[/:]/g, "_")}.json`;
  writeFileSync(file, `${JSON.stringify(await res.json())}\n`);
  console.log(`recorded ${path} -> ${file}`);
}
