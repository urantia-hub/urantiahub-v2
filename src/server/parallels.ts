import { ParagraphNotFound } from "@/content/fetchers";
import { paperById, paperPath } from "@/content/paper-index";
import type { RawCorpus, RawParallels, RawWork } from "@/content/parallels";
import { WORKS } from "@/parallels-works";

// The exact form of a paragraph reference. Anything else is refused before any work.
const REFERENCE = /^(\d{1,3}):(\d{1,2})\.(\d{1,3})$/;
const LAST_PAPER = 196;

// One passage as the reader sees it. `percent` is the score of the comparison, as the API gives it.
// `href` is the page of the passage: a paragraph of this site, or the public page of another work.
// `work` is the name of the work, for the filter of the study page.
// `library` is the work in the Library and the reference there ("Quran 2.255-257"), when the Library has it.
export type Parallel = { ref: string; work: string; source: string; text: string; percent: number; href: string | null; library?: { slug: string; ref: string } | null };
// `text` is the paragraph itself, for the study page.
// `weaker` holds the nearest passages of other works below the floor. The reader sees them only on request,
// when no passage is near.
// `papers` holds the passages of other parts of the Papers. `nearby` holds those of the same paper and of the
// papers beside it, which the reader sees on request.
// `works` is each work that the Hub compares, with the page of its source, for the study page.
export type Work = { work: string; source: string; href: string | null };
export type ParallelsAnswer = { text: string; outside: Parallel[]; weaker: Parallel[]; papers: Parallel[]; nearby: Parallel[]; works: Work[] };

// A passage of another work below this score is not near in meaning, and the reader does not see it.
// Set on 2026-10-10 from the results for 35 paragraphs across the Papers: from 0.46 up each passage was
// near, from 0.40 to 0.46 most were, and below 0.40 most shared a word and no meaning.
export const OUTSIDE_FLOOR = 0.4;
// Works whose near passages start higher. From 0.40 to 0.45 the passages of these two shared a word, a
// subject, or the style of the Bible, not a meaning (35 paragraphs, 2026-10-18).
export const WORK_FLOORS: Record<string, number> = { "book-of-mormon-1830": 0.45, "rig-veda-griffith-1896": 0.45 };
// Below the floor, down to here, a passage can still share a subject. Lower than this it shares nothing.
export const WEAK_FLOOR = 0.3;
const WEAK_MOST = 5;
// Paragraphs of the Papers score higher among themselves. The API gives the ten nearest.
export const PAPERS_FLOOR = 0.5;
// A passage of a paper at most this far from the paragraph's paper is nearby. On 2026-10-15, 65% of the nearest
// passages were this close, and only 16% were more than 20 papers away.
export const NEARBY_PAPERS = 2;

// A short prefix of a reference, in words that a reader knows.
const WORK_NAMES: Record<string, string> = {
  "koran-pickthall-1930": "Koran",
  "analects-legge-1861": "Analects",
  "epictetus-3-22-oldfather-1928": "Epictetus",
  "japji-macauliffe-1909": "Japji",
  "shinto-oracles-aston-1905": "Shinto oracles",
  "book-of-mormon-1830": "Book of Mormon",
  "hesiod-evelyn-white-1914": "Hesiod",
  "homeric-hymns-evelyn-white-1914": "Homeric Hymns",
  "poetic-edda-bellows-1923": "Poetic Edda",
  "aztec-hymns-brinton-1890": "Aztec hymns",
  "prose-edda-brodeur-1916": "Prose Edda",
  "kojiki-chamberlain-1882": "Kojiki",
  "upanishads-muller-1879": "Upanishads",
};
const NAMES: Record<string, string> = {
  "bhagavad-gita-besant-1922": "Bhagavad Gita",
  "diogenes-laertius-6-hicks-1925": "Diogenes Laertius",
  "tao-te-ching-legge-1891": "Tao Te Ching",
  "dhammapada-muller-1881": "Dhammapada",
  "shinto-oracles-aston-1905": "Shinto oracle",
  "rig-veda-griffith-1896": "Rig Veda",
  "book-of-the-dead-renouf-1904": "Book of the Dead",
  "homeric-hymns-evelyn-white-1914": "Homeric Hymn",
  "aztec-hymns-brinton-1890": "Aztec hymn",
  "chuang-tzu-giles-1889": "Chuang Tzu",
  "shu-king-legge-1879": "Shu King",
};

export function outsideRef(reference: string, corpus: Pick<RawCorpus, "id" | "refPrefix">): string {
  const name = NAMES[corpus.id];
  return name && reference.startsWith(`${corpus.refPrefix} `) ? `${name}${reference.slice(corpus.refPrefix.length)}` : reference;
}

// "Annie Besant (4th edition)" is "Besant".
const surname = (translator: string) => translator.replace(/\s*\(.*?\)/g, "").trim().split(/\s+/).pop() ?? translator;

// The sites that hold the texts. An address of another site, or of another form, is not a link.
const SITES = new Set(["ebible.org", "en.wikisource.org", "www.gutenberg.org"]);
export function outsideHref(url: string | null): string | null {
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

// Down, so a passage under a floor never shows the floor's number (0.399 is 39, not 40). The small
// addition keeps 0.57 at 57: in floating point 0.57 * 100 is 56.99999999999999.
export const percent = (similarity: number) => Math.floor(similarity * 100 + 1e-9);
const nearestFirst = (a: Parallel, b: Parallel) => b.percent - a.percent;

// `paperId` is the paper of the paragraph. With none, no passage is nearby.
// `slugs` maps a corpus id to its work in the Library, for the link "In the Library".
export function shapeParallels(raw: RawParallels, text = "", paperId?: string, slugs: ReadonlyMap<string, string> = new Map()): ParallelsAnswer {
  // `least` and `below` are the floors of a passage: its work's own one, or OUTSIDE_FLOOR.
  const from = (least: (floor: number) => number, below: (floor: number) => number): Parallel[] =>
    [
      ...raw.bible.filter((b) => b.similarity >= least(OUTSIDE_FLOOR) && b.similarity < below(OUTSIDE_FLOOR)).map((b) => ({ ref: b.reference, work: "Bible", source: "World English Bible", text: b.text, percent: percent(b.similarity), href: outsideHref(b.url) })),
      ...raw.scripture
        .filter((s) => {
          const floor = WORK_FLOORS[s.corpus.id] ?? OUTSIDE_FLOOR;
          return s.similarity >= least(floor) && s.similarity < below(floor);
        })
        .map((s) => ({ ref: outsideRef(s.reference, s.corpus), work: workName(s.corpus), source: `${surname(s.corpus.translator)}, ${s.corpus.year}`, text: s.text, percent: percent(s.similarity), href: outsideHref(s.url), library: slugs.has(s.corpus.id) ? { slug: slugs.get(s.corpus.id) as string, ref: s.reference } : null })),
    ].sort(nearestFirst);
  const outside = from((floor) => floor, () => Number.POSITIVE_INFINITY);
  const weaker = from(() => WEAK_FLOOR, (floor) => floor).slice(0, WEAK_MOST);
  const papers: Parallel[] = raw.papers
    .filter((p) => p.similarity >= PAPERS_FLOOR && paperById(p.paperId) && REFERENCE.exec(p.reference)?.[1] === p.paperId)
    .map((p) => ({ ref: p.reference, work: "The Urantia Papers", source: p.paperTitle, text: p.text, percent: percent(p.similarity), href: `${paperPath(p.paperId)}#${p.reference}` }))
    .sort(nearestFirst);
  const near = (p: Parallel) => paperId !== undefined && Math.abs(Number(p.ref.split(":")[0]) - Number(paperId)) <= NEARBY_PAPERS;
  return { text, outside, weaker, papers: papers.filter((p) => !near(p)), nearby: papers.filter(near), works: [] };
}

export const workName = (corpus: { id: string; title: string }) => WORK_NAMES[corpus.id] ?? NAMES[corpus.id] ?? corpus.title;
const OWN: Work[] = [
  { work: "The Urantia Papers", source: "", href: "/papers" },
  { work: "Bible", source: "World English Bible", href: "https://ebible.org/eng-web/" },
];

// Each work that the Hub compares: the Papers, the Bible, and each text that the API lists.
export function shapeWorks(corpora: readonly RawWork[]): Work[] {
  return [...OWN, ...corpora.map((c) => ({ work: workName(c), source: `${surname(c.translator)}, ${c.year}`, href: outsideHref(c.sourceUrl) }))];
}
// The list of the API did not load: the names that this code knows, with no page of a source.
const knownWorks = (): Work[] => WORKS.map((work) => OWN.find((own) => own.work === work) ?? { work, source: "", href: null });

const refuse = (status: number, error: string) => Response.json({ error }, { status, headers: { "cache-control": "no-store" } });

// The passages that are near in meaning to one paragraph, for the Parallels sheet of the reader.
export async function handleParallels(
  ref: string,
  load: (ref: string) => Promise<RawParallels>,
  loadText?: (paperId: string, ref: string) => Promise<string>,
  loadWorks?: () => Promise<readonly RawWork[]>,
): Promise<Response> {
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
  // The list of the works is extra. With no list, the answer stands with the names that this code knows.
  const corpora = loadWorks ? await loadWorks().catch(() => null) : null;
  const works = corpora ? shapeWorks(corpora) : knownWorks();
  const slugs = new Map((corpora ?? []).flatMap((c) => (c.slug ? [[c.id, c.slug] as const] : [])));
  return Response.json({ ...shapeParallels(raw, text, String(Number(parsed[1])), slugs), works }, { headers: { "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } });
}
