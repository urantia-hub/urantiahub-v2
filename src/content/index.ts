import "server-only";
import { UrantiaAPI } from "@urantia/api";
import { cacheLife, cacheTag } from "next/cache";
import { queryKey } from "@/search/query";
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
