import "server-only";
import { UrantiaAPI } from "@urantia/api";
import { cacheLife, cacheTag } from "next/cache";
import { queryKey } from "@/search/query";
import { fetchLibrary, fetchPassageOthers, fetchPassagePapers, fetchWorkPage, fetchWorkPages, fetchWorkPairs, type LibraryWork, PageNotFound, type RawPassageOthers, type RawPassagePapers, type WorkPage, type WorkPair, type WorkPassage } from "./library";
import { fetchParallels, fetchWorks, type RawParallels, type RawWork } from "./parallels";
import { fetchExact, fetchPaper, fetchPassage, fetchRelated, ParagraphNotFound, type PaperDoc, type Passage, type SearchPage } from "./fetchers";

// The only place in the app that talks to api.urantia.dev.
const client = new UrantiaAPI({ baseUrl: process.env.URANTIA_API_BASE_URL || undefined });

export async function getPaper(id: string): Promise<PaperDoc> {
  "use cache";
  cacheLife("weeks");
  cacheTag(`paper:${id}`);
  return fetchPaper(client, id);
}

export async function getPassage(ref: string): Promise<Passage> {
  "use cache";
  cacheLife("weeks");
  cacheTag("passages");
  return fetchPassage(client, ref);
}

// The text of each paragraph of one paper, from the shared cache. The terms address needs one paragraph for
// each request, and without this each server instance would read the whole paper from the API again.
// The cache holds one item for each paper, so no one can fill it with references that do not exist.
async function paragraphTexts(paperId: string): Promise<Record<string, string>> {
  "use cache: remote";
  cacheLife("weeks");
  cacheTag(`paper:${paperId}`);
  const paper = await getPaper(paperId);
  return Object.fromEntries(paper.sections.flatMap((section) => section.paragraphs).map((p) => [p.ref, p.text]));
}

// The check for a missing paragraph is outside the cached call: an error loses its kind when it crosses a cache.
export async function getParagraphText(paperId: string, ref: string): Promise<string> {
  const texts = await paragraphTexts(paperId);
  if (!Object.hasOwn(texts, ref)) throw new ParagraphNotFound(ref);
  return texts[ref];
}

// The passages that are near in meaning to one paragraph. The API computes them ahead of time, so the
// answer is kept for weeks in the store that all server instances share. The check for a missing
// paragraph is outside the cached call, as for the terms.
export async function getParallels(ref: string): Promise<RawParallels> {
  await getParagraphText(ref.split(":")[0], ref);
  return cachedParallels(ref);
}

// The parallels of a paragraph that the code names, not a reader, so the check for a missing paragraph is not needed.
export const getNamedParallels = (ref: string): Promise<RawParallels> => cachedParallels(ref);

async function cachedParallels(ref: string): Promise<RawParallels> {
  "use cache: remote";
  cacheLife("weeks");
  cacheTag("parallels");
  return fetchParallels(client, ref);
}

// Each text that the API compares with the Papers. The list changes only when the API gets a new text.
export async function getWorks(): Promise<RawWork[]> {
  "use cache: remote";
  cacheLife("weeks");
  cacheTag("parallels");
  return fetchWorks(process.env.URANTIA_API_BASE_URL || "https://api.urantia.dev");
}

// The Library: the works, the pages of a work, and the passages of a page. Each is kept for weeks in the
// shared store. The checks for a missing work or page are outside the cached calls, as for the terms.
const apiBase = () => process.env.URANTIA_API_BASE_URL || "https://api.urantia.dev";

export async function getLibrary(): Promise<LibraryWork[]> {
  "use cache: remote";
  cacheLife("weeks");
  cacheTag("library");
  return fetchLibrary(apiBase());
}

async function libraryWork(slug: string): Promise<LibraryWork> {
  const work = (await getLibrary()).find((w) => w.slug === slug);
  if (!work) throw new PageNotFound(`Work ${slug}`);
  return work;
}

async function cachedWorkPages(slug: string): Promise<WorkPage[]> {
  "use cache: remote";
  cacheLife("weeks");
  cacheTag("library");
  return fetchWorkPages(apiBase(), slug);
}

export async function getWorkPages(slug: string): Promise<WorkPage[]> {
  await libraryWork(slug);
  return cachedWorkPages(slug);
}

async function cachedWorkPage(slug: string, key: string): Promise<WorkPassage[]> {
  "use cache: remote";
  cacheLife("weeks");
  cacheTag("library");
  const work = await libraryWork(slug);
  const page = (await cachedWorkPages(slug)).find((p) => p.key === key) as WorkPage;
  return fetchWorkPage(apiBase(), work, page);
}

export async function getWorkPage(slug: string, key: string): Promise<WorkPassage[]> {
  const pages = await getWorkPages(slug);
  if (!pages.some((p) => p.key === key)) throw new PageNotFound(`Page ${key} of ${slug}`);
  return cachedWorkPage(slug, key);
}

async function cachedWorkPairs(slug: string): Promise<WorkPair[]> {
  "use cache: remote";
  cacheLife("weeks");
  cacheTag("library");
  return fetchWorkPairs(apiBase(), slug);
}

// The pairs are an extra on the page of a work: a failure gives none, and it is not kept, so they come back.
export async function getWorkPairs(slug: string): Promise<WorkPair[]> {
  try {
    return await cachedWorkPairs(slug);
  } catch {
    return [];
  }
}

// The parallels of one passage. The route checks first that the passage is one of its page. A failure is not
// kept, so a source that comes back is used at the next request.
export async function getPassagePapers(slug: string, ref: string): Promise<RawPassagePapers> {
  "use cache: remote";
  cacheLife("weeks");
  cacheTag("parallels");
  return fetchPassagePapers(apiBase(), slug, ref);
}

export async function getPassageOthers(slug: string, ref: string): Promise<RawPassageOthers> {
  "use cache: remote";
  cacheLife("weeks");
  cacheTag("parallels");
  return fetchPassageOthers(apiBase(), slug, ref);
}

export type { LibraryWork, WorkPage, WorkPair, WorkPassage } from "./library";
export { PageNotFound } from "./library";
export { ContentError, excerptPassage, ParagraphNotFound } from "./fetchers";
export type { PaperDoc, Paragraph, ParagraphAudio, Passage, SearchHit, SearchPage, Section } from "./fetchers";

// A search result does not change until the text changes, so each result is kept for days.
// The store is the remote one, which all server instances share: the API has a rate limit for the whole site,
// and each new text costs it two requests. A failed search throws, and a thrown call is not kept.
// The key is the lower-case form, so "Soul" and "soul" are one search.
export async function searchExact(q: string, page = 0, limit = 8): Promise<SearchPage> {
  return cachedExact(queryKey(q), page, limit);
}

export async function searchRelated(q: string): Promise<SearchPage> {
  return cachedRelated(queryKey(q));
}

async function cachedExact(key: string, page: number, limit: number): Promise<SearchPage> {
  "use cache: remote";
  cacheLife("days");
  cacheTag("search");
  return fetchExact(client, key, page, limit);
}

async function cachedRelated(key: string): Promise<SearchPage> {
  "use cache: remote";
  cacheLife("days");
  cacheTag("search");
  return fetchRelated(client, key, 10);
}
