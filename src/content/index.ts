import "server-only";
import { UrantiaAPI } from "@urantia/api";
import { cacheLife, cacheTag } from "next/cache";
import { fetchExact, fetchPaper, fetchPassage, fetchRelated, type PaperDoc, type Passage, type SearchPage } from "./fetchers";

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

export { ContentError, excerptPassage } from "./fetchers";
export type { PaperDoc, Paragraph, ParagraphAudio, Passage, SearchHit, SearchPage, Section } from "./fetchers";

// A search result does not change until the text changes, so each result is kept for days.
// A failed search throws, and a thrown call is not kept.
export async function searchExact(q: string, page = 0, limit = 8): Promise<SearchPage> {
  "use cache";
  cacheLife("days");
  cacheTag("search");
  return fetchExact(client, q, page, limit);
}

export async function searchRelated(q: string): Promise<SearchPage> {
  "use cache";
  cacheLife("days");
  cacheTag("search");
  return fetchRelated(client, q, 10);
}
