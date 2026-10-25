import { z } from "zod";
import type { Lang } from "@/i18n/lang";
import { BIBLE, biblePages } from "@/library/bible";
import { pageKey, pageReadRef, unitNumber } from "@/library/refs";
import { ContentError } from "./fetchers";

// The Library: the works beside the Papers, their pages, and the passages of one page. The package has no
// calls for these yet, so they are plain requests. Each answer is checked, as in `parallels.ts`.

export type LibraryWork = {
  slug: string;
  corpusId: string;
  title: string;
  tradition: string;
  kind: "scripture" | "classic";
  summary: string;
  translator: string;
  year: number | null;
  /** The translation in one line: "F. Max Muller, 1881", or "World English Bible". */
  byline: string;
  refPrefix: string;
  refLevels: 1 | 2 | 3;
  divisionLabel: string;
  unitLabel: string;
  /** The count of verses, paragraphs, or other units of the whole work. */
  units: number | null;
  /** The section of Paper 131 on the tradition of the work ("131:3"), when there is one. */
  urantiaSection: string | null;
  /** The page of the copy that the text comes from. */
  sourceUrl: string | null;
};
// A page of the Bible also has the reference that reads it, its part of the Bible, and its book code.
export type WorkPage = {
  key: string;
  division: number;
  subdivision: number | null;
  title: string | null;
  firstRef: string;
  lastRef: string;
  count: number;
  readRef?: string;
  part?: string | null;
  book?: { code: string; name: string; title: string };
};
export type WorkPassage = { ref: string; number: string; text: string; url: string | null };
/** A passage of a work and a paragraph of the Papers that are nearest to each other, as the API compares them. */
export type WorkPair = { ref: string; text: string; percent: number; paragraph: { ref: string; paperId: string; paperTitle: string; text: string } };

/** A work or a page that the Library does not have. */
export class PageNotFound extends Error {
  constructor(what: string) {
    super(`${what}: the Library has no such page`);
    this.name = "PageNotFound";
  }
}

const WorksSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().nullish(),
      tradition: z.string().min(1),
      kind: z.string(),
      summary: z.string().nullish(),
      translator: z.string().nullish(),
      year: z.number().nullish(),
      units: z.number().int().nullish(),
      urantiaSection: z.string().regex(/^\d{1,3}:\d{1,2}$/).nullish(),
    }),
  ),
});
const CorporaSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().min(1),
      slug: z.string().min(1),
      title: z.string().min(1),
      translator: z.string(),
      year: z.number(),
      refPrefix: z.string().min(1),
      refLevels: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      divisionLabel: z.string(),
      unitLabel: z.string(),
      sourceUrl: z.string().nullish(),
    }),
  ),
});
const PagesSchema = z.object({
  data: z.object({
    pages: z.array(
      z.object({
        division: z.number().int(),
        subdivision: z.number().int().nullable(),
        title: z.string().nullable(),
        firstRef: z.string().min(1),
        lastRef: z.string().min(1),
        passageCount: z.number().int().positive(),
      }),
    ),
  }),
});
const BooksSchema = z.object({
  data: z.array(z.object({ bookCode: z.string().min(1), bookName: z.string().min(1), fullName: z.string(), bookOrder: z.number().int(), canon: z.string(), chapterCount: z.number().int().positive() })),
});
const PairsSchema = z.object({
  data: z.array(
    z.object({
      paragraph: z.object({ standardReferenceId: z.string().min(1), paperId: z.string().min(1), paperTitle: z.string().min(1), text: z.string().min(1) }),
      passage: z.object({ reference: z.string().min(1), text: z.string().min(1) }),
      similarity: z.number(),
    }),
  ),
});
const ReadSchema = z.object({ data: z.array(z.object({ reference: z.string().min(1), text: z.string().min(1), url: z.string().nullish() })) });

async function getJson<T>(baseUrl: string, path: string, schema: z.ZodType<T>, what: string): Promise<T> {
  let raw: unknown;
  try {
    const res = await fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(String(res.status));
    raw = await res.json();
  } catch (cause) {
    throw new ContentError(`${what}: the content API request failed`, cause);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new ContentError(`${what}: the content API response has an unknown shape`, parsed.error);
  return parsed.data;
}

const byline = (translator: string, year: number | null) => {
  const name = translator.replace(/\s*\(.*?\)/g, "");
  return year === null ? name : `${name}, ${year}`;
};

// The API lists no source for the Bible: it is the World English Bible of eBible.org.
const BIBLE_SOURCE = "https://ebible.org/find/details.php?id=eng-web";

// The catalog in a language: the titles, traditions, summaries, and labels. The text of a work stays English.
const langQuery = (lang: Lang) => (lang === "es" ? "?lang=es" : "");

/** The works of the Library, in the order of `GET /works`: the Bible first. */
export async function fetchLibrary(baseUrl: string, lang: Lang = "en"): Promise<LibraryWork[]> {
  const [works, corpora] = await Promise.all([
    getJson(baseUrl, `/works${langQuery(lang)}`, WorksSchema, "The Library"),
    getJson(baseUrl, `/scriptures${langQuery(lang)}`, CorporaSchema, "The Library"),
  ]);
  const bySlug = new Map(corpora.data.map((c) => [c.slug, c]));
  return works.data.flatMap((w): LibraryWork[] => {
    if (w.id === BIBLE) {
      const translator = w.translator ?? "World English Bible";
      return [
        {
          slug: BIBLE,
          corpusId: BIBLE,
          title: w.title ?? (lang === "es" ? "La Biblia" : "The Bible"),
          tradition: w.tradition,
          kind: "scripture",
          summary: w.summary ?? "",
          translator,
          year: w.year ?? null,
          byline: byline(translator, w.year ?? null),
          refPrefix: "",
          refLevels: 2,
          divisionLabel: lang === "es" ? "libro" : "book",
          unitLabel: lang === "es" ? "versículo" : "verse",
          units: w.units ?? null,
          urantiaSection: w.urantiaSection ?? null,
          sourceUrl: BIBLE_SOURCE,
        },
      ];
    }
    const c = bySlug.get(w.id);
    if (!c) return [];
    return [
      {
        slug: c.slug,
        corpusId: c.id,
        title: c.title,
        tradition: w.tradition,
        kind: w.kind === "scripture" ? "scripture" : "classic",
        summary: w.summary ?? "",
        translator: c.translator,
        year: c.year,
        byline: byline(c.translator, c.year),
        refPrefix: c.refPrefix,
        refLevels: c.refLevels,
        divisionLabel: c.divisionLabel,
        unitLabel: c.unitLabel,
        units: w.units ?? null,
        urantiaSection: w.urantiaSection ?? null,
        sourceUrl: c.sourceUrl ?? null,
      },
    ];
  });
}

/** The reading pages of one work, in order. A Spanish page keeps the English key and references, so the
 * addresses are the same in both languages, and takes the Spanish title of the page at the same place. */
export async function fetchWorkPages(baseUrl: string, slug: string, lang: Lang = "en"): Promise<WorkPage[]> {
  if (slug === BIBLE) {
    const books = (path: string) => getJson(baseUrl, path, BooksSchema, "The books of the Bible").then((found) => found.data);
    if (lang === "en") return biblePages(await books("/bible/books"));
    const [english, spanish] = await Promise.all([books("/bible/books"), books("/bible/books?lang=es")]);
    return biblePages(english, spanish, lang);
  }
  const pages = (query: string) => getJson(baseUrl, `/scriptures/${encodeURIComponent(slug)}${query}`, PagesSchema, `The pages of ${slug}`);
  if (lang === "en") return workPages(await pages(""));
  const [english, spanish] = await Promise.all([pages(""), pages(langQuery(lang))]);
  const titles = spanish.data.pages;
  // A Spanish list that does not line up with the English one at a page gives that page its English title.
  return workPages(english).map((p, i) => (titles[i]?.division === p.division && titles[i]?.subdivision === p.subdivision ? { ...p, title: titles[i].title } : p));
}

function workPages(found: z.infer<typeof PagesSchema>): WorkPage[] {
  return found.data.pages.map((p) => ({
    key: pageKey(p.division, p.subdivision),
    division: p.division,
    subdivision: p.subdivision,
    title: p.title,
    firstRef: p.firstRef,
    lastRef: p.lastRef,
    count: p.passageCount,
  }));
}

/** The passages of one page. A page that comes back short is an error, not a short page. A chapter of the
 * Bible has no count before its read (0), so it needs at least one verse. A verse shows its own number only. */
export async function fetchWorkPage(baseUrl: string, work: LibraryWork, page: WorkPage): Promise<WorkPassage[]> {
  const ref = page.readRef ?? pageReadRef(work.refLevels, page);
  const what = `Page ${page.key} of ${work.slug}`;
  const found = await getJson(baseUrl, `/works/${encodeURIComponent(work.slug)}/${encodeURIComponent(ref)}`, ReadSchema, what);
  const short = page.count === 0 ? found.data.length === 0 : found.data.length !== page.count;
  if (short) throw new ContentError(`${what}: ${found.data.length} passages, not ${page.count}`);
  const number = (reference: string) => (work.slug === BIBLE ? (reference.split(":").pop() ?? reference) : unitNumber(reference));
  return found.data.map((p) => ({ ref: p.reference, number: number(p.reference), text: p.text, url: p.url ?? null }));
}

// The parallels of one passage: the paragraphs of the Papers, and the passages of the other works.
export type RawPassagePapers = { reference: string; url?: string | null; papers: { reference: string; paperTitle: string; text: string; similarity: number }[] };
export type RawPassageOthers = {
  label: string;
  others: { workId: string; workTitle: string; reference: string; text: string; url: string | null; similarity: number }[];
};

const PapersSchema = z.object({
  data: z.object({
    reference: z.string().min(1),
    url: z.string().nullish(),
    urantiaParallels: z.array(z.object({ standardReferenceId: z.string().min(1), paperTitle: z.string(), text: z.string().min(1), similarity: z.number().finite() })),
  }),
});
const OthersSchema = z.object({
  data: z.object({
    chunk: z.object({ label: z.string().min(1) }),
    parallels: z.array(
      z.object({
        work: z.object({ id: z.string().min(1), title: z.string() }),
        reference: z.string().min(1),
        text: z.string().min(1),
        url: z.string().nullish(),
        similarity: z.number().finite(),
      }),
    ),
  }),
});

const passagePath = (slug: string, ref: string, kind: string) => `/works/${encodeURIComponent(slug)}/${encodeURIComponent(ref)}/${kind}`;

export async function fetchPassagePapers(baseUrl: string, slug: string, ref: string): Promise<RawPassagePapers> {
  const found = await getJson(baseUrl, passagePath(slug, ref, "urantia-parallels"), PapersSchema, `The Papers parallels of ${ref}`);
  return {
    reference: found.data.reference,
    url: found.data.url ?? null,
    papers: found.data.urantiaParallels.map((u) => ({ reference: u.standardReferenceId, paperTitle: u.paperTitle, text: u.text, similarity: u.similarity })),
  };
}

export async function fetchPassageOthers(baseUrl: string, slug: string, ref: string): Promise<RawPassageOthers> {
  const found = await getJson(baseUrl, passagePath(slug, ref, "work-parallels"), OthersSchema, `The other works near ${ref}`);
  return {
    label: found.data.chunk.label,
    others: found.data.parallels.map((p) => ({ workId: p.work.id, workTitle: p.work.title, reference: p.reference, text: p.text, url: p.url ?? null, similarity: p.similarity })),
  };
}

/** The three pairs of a work that are nearest to the Papers. */
export async function fetchWorkPairs(baseUrl: string, slug: string): Promise<WorkPair[]> {
  const found = await getJson(baseUrl, `/scriptures/insights/pairs?corpus=${encodeURIComponent(slug)}&limit=3`, PairsSchema, `The pairs of ${slug}`);
  return found.data.map((d) => ({
    ref: d.passage.reference,
    text: d.passage.text,
    percent: Math.floor(d.similarity * 100 + 1e-9),
    paragraph: { ref: d.paragraph.standardReferenceId, paperId: d.paragraph.paperId, paperTitle: d.paragraph.paperTitle, text: d.paragraph.text },
  }));
}
