import { ParagraphNotFound } from "@/content/fetchers";
import { paperById, paperPath } from "@/content/paper-index";
import type { RawCorpus, RawParallels } from "@/content/parallels";

// The exact form of a paragraph reference. Anything else is refused before any work.
const REFERENCE = /^(\d{1,3}):(\d{1,2})\.(\d{1,3})$/;
const LAST_PAPER = 196;

// One passage as the reader sees it. `percent` is the score of the comparison, as the API gives it.
// `href` is the page of the passage: a paragraph of this site, or the public page of another work.
// `work` is the name of the work, for the filter of the study page.
export type Parallel = { ref: string; work: string; source: string; text: string; percent: number; href: string | null };
// `text` is the paragraph itself, for the study page.
// `weaker` holds the nearest passages of other works below the floor. The reader sees them only on request,
// when no passage is near.
export type ParallelsAnswer = { text: string; outside: Parallel[]; weaker: Parallel[]; papers: Parallel[] };

// A passage of another work below this score is not near in meaning, and the reader does not see it.
// Set on 2026-10-10 from the results for 35 paragraphs across the Papers: from 0.46 up each passage was
// near, from 0.40 to 0.46 most were, and below 0.40 most shared a word and no meaning.
export const OUTSIDE_FLOOR = 0.4;
// Below the floor, down to here, a passage can still share a subject. Lower than this it shares nothing.
export const WEAK_FLOOR = 0.3;
const WEAK_MOST = 5;
// Paragraphs of the Papers score higher among themselves. The API gives the ten nearest.
export const PAPERS_FLOOR = 0.5;

// A short prefix of a reference, in words that a reader knows.
const WORK_NAMES: Record<string, string> = {
  "koran-pickthall-1930": "Koran",
  "analects-legge-1861": "Analects",
  "epictetus-3-22-oldfather-1928": "Epictetus",
  "japji-macauliffe-1909": "Japji",
  "shinto-oracles-aston-1905": "Shinto oracles",
};
const NAMES: Record<string, string> = {
  "bhagavad-gita-besant-1922": "Bhagavad Gita",
  "diogenes-laertius-6-hicks-1925": "Diogenes Laertius",
  "tao-te-ching-legge-1891": "Tao Te Ching",
  "dhammapada-muller-1881": "Dhammapada",
  "shinto-oracles-aston-1905": "Shinto oracle",
};

function outsideRef(reference: string, corpus: RawCorpus): string {
  const name = NAMES[corpus.id];
  return name && reference.startsWith(`${corpus.refPrefix} `) ? `${name}${reference.slice(corpus.refPrefix.length)}` : reference;
}

// "Annie Besant (4th edition)" is "Besant".
const surname = (translator: string) => translator.replace(/\s*\(.*?\)/g, "").trim().split(/\s+/).pop() ?? translator;

// The sites that hold the texts. An address of another site, or of another form, is not a link.
const SITES = new Set(["ebible.org", "en.wikisource.org", "www.gutenberg.org"]);
function outsideHref(url: string | null): string | null {
  if (!url) return null;
  try {
    // "https:ebible.org/x" has no "//": a browser reads it as a path of this site.
    if (!url.startsWith("https://")) return null;
    const parsed = new URL(url);
    const plain = parsed.protocol === "https:" && parsed.port === "" && parsed.username === "" && parsed.password === "";
    // The address as the parser read it, so the server and the browser mean the same place.
    return plain && SITES.has(parsed.hostname) ? parsed.href : null;
  } catch {
    return null;
  }
}

const percent = (similarity: number) => Math.round(similarity * 100);
const nearestFirst = (a: Parallel, b: Parallel) => b.percent - a.percent;

export function shapeParallels(raw: RawParallels, text = ""): ParallelsAnswer {
  const from = (least: number, below: number): Parallel[] =>
    [
      ...raw.bible.filter((b) => b.similarity >= least && b.similarity < below).map((b) => ({ ref: b.reference, work: "Bible", source: "World English Bible", text: b.text, percent: percent(b.similarity), href: outsideHref(b.url) })),
      ...raw.scripture
        .filter((s) => s.similarity >= least && s.similarity < below)
        .map((s) => ({ ref: outsideRef(s.reference, s.corpus), work: WORK_NAMES[s.corpus.id] ?? NAMES[s.corpus.id] ?? s.corpus.title, source: `${surname(s.corpus.translator)}, ${s.corpus.year}`, text: s.text, percent: percent(s.similarity), href: outsideHref(s.url) })),
    ].sort(nearestFirst);
  const outside = from(OUTSIDE_FLOOR, Number.POSITIVE_INFINITY);
  const weaker = from(WEAK_FLOOR, OUTSIDE_FLOOR).slice(0, WEAK_MOST);
  const papers: Parallel[] = raw.papers
    .filter((p) => p.similarity >= PAPERS_FLOOR && paperById(p.paperId) && REFERENCE.exec(p.reference)?.[1] === p.paperId)
    .map((p) => ({ ref: p.reference, work: "The Urantia Papers", source: p.paperTitle, text: p.text, percent: percent(p.similarity), href: `${paperPath(p.paperId)}#${p.reference}` }))
    .sort(nearestFirst);
  return { text, outside, weaker, papers };
}

const refuse = (status: number, error: string) => Response.json({ error }, { status, headers: { "cache-control": "no-store" } });

// The passages that are near in meaning to one paragraph, for the Parallels sheet of the reader.
export async function handleParallels(ref: string, load: (ref: string) => Promise<RawParallels>, loadText?: (paperId: string, ref: string) => Promise<string>): Promise<Response> {
  const parsed = REFERENCE.exec(ref);
  if (!parsed || Number(parsed[1]) > LAST_PAPER) return refuse(400, "This is not a paragraph reference.");
  // "001:0.1" has the right form, but it is not the name of a paragraph. One paragraph has one address.
  if (ref !== `${Number(parsed[1])}:${Number(parsed[2])}.${Number(parsed[3])}`) return refuse(400, "This is not a paragraph reference.");

  let raw: RawParallels;
  let text = "";
  try {
    raw = await load(ref);
    if (loadText) text = await loadText(String(Number(parsed[1])), ref);
  } catch (error) {
    return error instanceof ParagraphNotFound ? refuse(404, "The paper has no such paragraph.") : refuse(502, "The parallels did not load.");
  }
  // The parallels change only when the API computes them again, so a shared cache can keep the answer for a day.
  return Response.json(shapeParallels(raw, text), { headers: { "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } });
}
