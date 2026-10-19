import { z } from "zod";
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
  year: number;
  refPrefix: string;
  refLevels: 1 | 2 | 3;
  divisionLabel: string;
  unitLabel: string;
};
export type WorkPage = { key: string; division: number; subdivision: number | null; title: string | null; firstRef: string; lastRef: string; count: number };
export type WorkPassage = { ref: string; number: string; text: string; url: string | null };

/** A work or a page that the Library does not have. */
export class PageNotFound extends Error {
  constructor(what: string) {
    super(`${what}: the Library has no such page`);
    this.name = "PageNotFound";
  }
}

const WorksSchema = z.object({
  data: z.array(z.object({ id: z.string().min(1), tradition: z.string().min(1), kind: z.string(), summary: z.string().nullish() })),
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

/** The works of the Library, in the order of `GET /works`, with no Bible. */
export async function fetchLibrary(baseUrl: string): Promise<LibraryWork[]> {
  const [works, corpora] = await Promise.all([
    getJson(baseUrl, "/works", WorksSchema, "The Library"),
    getJson(baseUrl, "/scriptures", CorporaSchema, "The Library"),
  ]);
  const bySlug = new Map(corpora.data.map((c) => [c.slug, c]));
  return works.data.flatMap((w) => {
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
        refPrefix: c.refPrefix,
        refLevels: c.refLevels,
        divisionLabel: c.divisionLabel,
        unitLabel: c.unitLabel,
      },
    ];
  });
}

/** The reading pages of one work, in order. */
export async function fetchWorkPages(baseUrl: string, slug: string): Promise<WorkPage[]> {
  const found = await getJson(baseUrl, `/scriptures/${encodeURIComponent(slug)}`, PagesSchema, `The pages of ${slug}`);
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

/** The passages of one page. A page that comes back short is an error, not a short page. */
export async function fetchWorkPage(baseUrl: string, work: LibraryWork, page: WorkPage): Promise<WorkPassage[]> {
  const ref = pageReadRef(work.refLevels, page);
  const what = `Page ${page.key} of ${work.slug}`;
  const found = await getJson(baseUrl, `/works/${encodeURIComponent(work.slug)}/${encodeURIComponent(ref)}`, ReadSchema, what);
  if (found.data.length !== page.count) throw new ContentError(`${what}: ${found.data.length} passages, not ${page.count}`);
  return found.data.map((p) => ({ ref: p.reference, number: unitNumber(p.reference), text: p.text, url: p.url ?? null }));
}
