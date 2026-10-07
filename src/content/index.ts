import "server-only";
import { UrantiaAPI } from "@urantia/api";
import { cacheLife, cacheTag } from "next/cache";
import { fetchPaper, fetchPassage, type PaperDoc, type Passage } from "./fetchers";

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
export type { PaperDoc, Paragraph, Passage, Section } from "./fetchers";
