// Writes src/content/text-index.json: for each world text, its title, the name of its pages, and each
// page with its count of passages and of words, from the API. Run with: bun run sync:texts
// One page is one request, so the script keeps to 100 requests a minute, under the API limit of 200.
import { writeFileSync } from "node:fs";
import { fetchLibrary, fetchWorkPage, fetchWorkPages } from "../src/content/library";
import { GROUPED } from "../src/library/books";

const base = process.env.URANTIA_API_BASE_URL || "https://api.urantia.dev";
const GAP_MS = 600;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function retry<T>(what: string, call: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await call();
    } catch (error) {
      if (attempt === 3) throw error;
      console.warn(`${what}: try ${attempt + 2}`);
      await wait(5000 * (attempt + 1));
    }
  }
}

// [page key, passages, words] for each page, in the order of the work.
type Row = [string, number, number];
const works: Record<string, { title: string; unit: string; pages: Row[] }> = {};
const library = await retry("the works", () => fetchLibrary(base));
for (const work of library) {
  const pages = await retry(`the pages of ${work.slug}`, () => fetchWorkPages(base, work.slug));
  const rows: Row[] = [];
  for (const page of pages) {
    const passages = await retry(`${work.slug} ${page.key}`, () => fetchWorkPage(base, work, page));
    rows.push([page.key, passages.length, passages.reduce((n, p) => n + p.text.split(/\s+/).filter(Boolean).length, 0)]);
    await wait(GAP_MS);
  }
  works[work.slug] = { title: work.title, unit: work.slug === "bible" ? "chapter" : (GROUPED[work.slug] ?? work.divisionLabel), pages: rows };
  console.log(`${work.slug}: ${rows.length} pages`);
}

if (Object.keys(works).length !== library.length) throw new Error("A work is missing");
writeFileSync("src/content/text-index.json", `${JSON.stringify({ works })}\n`);
console.log(`Wrote ${Object.keys(works).length} works`);
