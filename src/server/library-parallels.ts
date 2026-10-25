import type { LibraryWork, RawPassageOthers, RawPassagePapers, WorkPage, WorkPassage } from "@/content/library";
import { paperById, paperPath } from "@/content/paper-index";
import type { Lang } from "@/i18n/lang";
import { pageOfRef } from "@/library/refs";
import { pairPath } from "@/pair/link";
import { passageForLink } from "@/pair/passage";
import { refForLink } from "@/reader/share-link";
import { OUTSIDE_FLOOR, type Parallel, type ParallelsAnswer, outsideHref, outsideRef, percent, WEAK_FLOOR, WORK_FLOORS, workName } from "./parallels";

// A passage of another work below this score is not near in meaning to a passage of a work. Set on 2026-10-18
// from 30 chunks of the works, 10 each: above 0.53 most pairs shared a meaning, from 0.47 about half, below it a style only.
export const WORKS_FLOOR = 0.47;
const WEAK_MOST = 5;
const PAPER_REF = /^(\d{1,3}):\d{1,2}\.\d{1,3}$/;

// `label` names the chunk that the parallels belong to ("Dhammapada 21-23"). `weakerPapers` is the list
// below the floor for the half "In the Papers", as `weaker` is for "Other works". `source` is the translation,
// and `href` the passage at its source, on a site of the list.
export type PassageAnswer = ParallelsAnswer & { label: string; weakerPapers: Parallel[]; source: string; href: string | null };

const surname = (translator: string) => translator.replace(/\s*\(.*?\)/g, "").trim().split(/\s+/).pop() ?? translator;
const nearestFirst = (a: Parallel, b: Parallel) => b.percent - a.percent;
// "Dhp 21-23" is "Dhammapada 21-23", as on a paper page.
const shortRef = (reference: string, work: LibraryWork | undefined) => (work ? outsideRef(reference, { id: work.corpusId, refPrefix: work.refPrefix }) : reference);

/** The two halves of the parallels of a passage, each with its floor and its list below the floor. `marked` is the
 * passage that the reader marked: a near paragraph opens the pair page of that paragraph and it, not of the chunk. */
// `lang` is the language of the page: a Spanish page names each paper in Spanish and links its Spanish page,
// and marks the passages of the works English. The handler puts the Spanish paragraphs in.
export function shapePassageParallels(raw: RawPassagePapers, others: RawPassageOthers | null, work: LibraryWork, library: LibraryWork[], marked?: string, lang: Lang = "en"): PassageAnswer {
  const papersFloor = WORK_FLOORS[work.corpusId] ?? OUTSIDE_FLOOR;
  const english = lang === "es" ? ({ english: true } as const) : {};
  const papers = raw.papers
    .flatMap((p) => {
      const paperId = PAPER_REF.exec(p.reference)?.[1];
      if (!paperId || !paperById(paperId) || p.similarity < WEAK_FLOOR) return [];
      const source = lang === "en" ? p.paperTitle : (paperById(paperId, lang)?.title ?? p.paperTitle);
      const parallel: Parallel = { ref: p.reference, work: "The Urantia Papers", source, text: p.text, percent: percent(p.similarity), href: `${paperPath(paperId, lang)}#${p.reference}` };
      return [{ parallel, below: p.similarity < papersFloor }];
    })
    .sort((a, b) => nearestFirst(a.parallel, b.parallel));

  const bySlug = new Map(library.map((w) => [w.slug, w]));
  const outsideAll = (others?.others ?? [])
    .filter((o) => o.workId !== work.slug && o.similarity >= WEAK_FLOOR)
    .map((o) => {
      const other = bySlug.get(o.workId);
      const bible = o.workId === "bible";
      const parallel: Parallel = {
        ref: shortRef(o.reference, other),
        work: bible ? "Bible" : other ? workName({ id: other.corpusId, title: other.title }) : o.workTitle,
        source: bible ? "World English Bible" : other ? `${surname(other.translator)}, ${other.year}` : "",
        text: o.text,
        percent: percent(o.similarity),
        href: outsideHref(o.url),
        library: other ? { slug: other.slug, ref: o.reference } : null,
        ...english,
      };
      return { parallel, below: o.similarity < WORKS_FLOOR };
    })
    .sort((a, b) => nearestFirst(a.parallel, b.parallel));

  const pick = (list: { parallel: Parallel; below: boolean }[], below: boolean) => list.filter((x) => x.below === below).map((x) => x.parallel);
  return {
    text: "",
    label: shortRef(others?.label ?? raw.reference, work),
    source: work.year === null ? work.translator : `${surname(work.translator)}, ${work.year}`,
    href: outsideHref(raw.url ?? null),
    papers: pick(papers, false).map((p) => (marked ? { ...p, pairPath: pairPath({ ref: refForLink(p.ref), refCode: "", work: work.slug, passage: passageForLink(marked, work), passageCode: "" }) } : p)),
    weakerPapers: pick(papers, true).slice(0, WEAK_MOST),
    outside: pick(outsideAll, false),
    weaker: pick(outsideAll, true).slice(0, WEAK_MOST),
    nearby: [],
    works: [],
  };
}

type Deps = {
  library: () => Promise<LibraryWork[]>;
  pages: (slug: string) => Promise<WorkPage[]>;
  page: (slug: string, key: string) => Promise<WorkPassage[]>;
  papers: (slug: string, ref: string) => Promise<RawPassagePapers>;
  others: (slug: string, ref: string) => Promise<RawPassageOthers>;
  /** The text of a paragraph of the Papers in Spanish, for a Spanish page. */
  paragraph?: (paperId: string, ref: string) => Promise<string>;
};

// A paragraph of the Papers in Spanish. One that fails keeps its English text, marked English.
async function inSpanish(list: Parallel[], text: Deps["paragraph"]): Promise<Parallel[]> {
  return Promise.all(
    list.map(async (p) => {
      const paperId = PAPER_REF.exec(p.ref)?.[1];
      if (!paperId || !text) return { ...p, english: true as const };
      try {
        return { ...p, text: await text(paperId, p.ref) };
      } catch {
        return { ...p, english: true as const };
      }
    }),
  );
}

const refuse = (status: number, error: string) => Response.json({ error }, { status, headers: { "cache-control": "no-store" } });
// Brackets are in the name of a book of the Bible: "Daniel (Greek) 3:5".
const REF = /^[\p{L}\p{N} .:,()-]{1,40}$/u;

// The parallels of one passage of a work, for the sheet of a work page. The passage must be one of its page,
// so no one can fill the shared cache with references that do not exist.
export async function handlePassageParallels(slug: string, ref: string, deps: Deps, lang: Lang = "en"): Promise<Response> {
  if (!REF.test(ref)) return refuse(400, "This is not a passage reference.");
  let work: LibraryWork | undefined;
  let held = false;
  let asked = ref;
  try {
    work = (await deps.library()).find((w) => w.slug === slug);
    if (!work) return refuse(400, "This work is not in World texts.");
    const pages = await deps.pages(slug);
    const page = pageOfRef(work.refLevels, pages, ref);
    held = page !== null && (await deps.page(slug, page.key)).some((p) => p.ref === ref);
    // A verse of the Bible goes to the API by its book code: it refuses "Daniel (Greek) 3:5" and "Psalm 151 1:3".
    if (page?.book && ref.startsWith(`${page.book.name} `)) asked = `${page.book.code}${ref.slice(page.book.name.length)}`;
  } catch {
    return refuse(502, "The parallels did not load.");
  }
  if (!held) return refuse(404, "The work has no such passage.");

  let raw: RawPassagePapers;
  try {
    raw = await deps.papers(slug, asked);
  } catch {
    return refuse(502, "The parallels did not load.");
  }
  // The other works are a second source. When it fails or is not there yet, the half is empty.
  const others = await deps.others(slug, asked).catch(() => null);
  const shaped = shapePassageParallels(raw, others, work as LibraryWork, await deps.library(), ref, lang);
  const answer = lang === "en" ? shaped : { ...shaped, papers: await inSpanish(shaped.papers, deps.paragraph), weakerPapers: await inSpanish(shaped.weakerPapers, deps.paragraph) };
  return Response.json(answer, { headers: { "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } });
}
