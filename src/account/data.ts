// The reader's place and settings in the account. Each function checks what it reads and what it
// writes: the record of preferences is shared by all apps, and a browser sends the values.

import { paperById } from "@/content/paper-index";
import { parsePlace, parseSettings, PLACE_KEY, type Place, type Settings, SETTINGS_KEY } from "./reader-data";

export type Gateway = {
  preferences(accessToken: string): Promise<Record<string, unknown>>;
  savePreferences(accessToken: string, patch: Record<string, unknown>): Promise<void>;
  markRead(accessToken: string, refs: string[]): Promise<void>;
  progress(accessToken: string): Promise<{ paperId: string; readCount: number; totalParagraphs: number }[]>;
};

export type ReaderData = { place: Place | null; settings: Settings | null };

export async function readReader(gateway: Gateway, accessToken: string, now: number = Date.now()): Promise<ReaderData> {
  const all = await gateway.preferences(accessToken);
  return { place: parsePlace(all[PLACE_KEY], now), settings: parseSettings(all[SETTINGS_KEY], now) };
}

export async function savePlace(gateway: Gateway, accessToken: string, value: unknown, now: number = Date.now()): Promise<{ saved: boolean }> {
  const place = parsePlace(value, now);
  if (!place) return { saved: false };
  await gateway.savePreferences(accessToken, { [PLACE_KEY]: place });
  return { saved: true };
}

export async function saveSettings(gateway: Gateway, accessToken: string, value: unknown, now: number = Date.now()): Promise<{ saved: boolean }> {
  const settings = parseSettings(value, now);
  if (!settings) return { saved: false };
  await gateway.savePreferences(accessToken, { [SETTINGS_KEY]: settings });
  return { saved: true };
}

const READ_MAX = 200;
const REF = /^(\d{1,3}):\d{1,3}\.\d{1,3}$/;

// A batch of paragraphs that the reader read. Only a reference of a paper that exists goes to the API.
export async function saveRead(gateway: Gateway, accessToken: string, value: unknown): Promise<{ saved: number }> {
  const given = typeof value === "object" && value !== null ? (value as { refs?: unknown }).refs : null;
  if (!Array.isArray(given)) return { saved: 0 };
  const refs = new Set<string>();
  for (const ref of given) {
    if (refs.size === READ_MAX) break;
    if (typeof ref !== "string") continue;
    const paper = REF.exec(ref)?.[1];
    if (paper !== undefined && paperById(paper)) refs.add(ref);
  }
  if (refs.size === 0) return { saved: 0 };
  await gateway.markRead(accessToken, [...refs]);
  return { saved: refs.size };
}

// A paper counts as read at nine of ten paragraphs: the rule for one paragraph needs time in view, and
// a reader skims a short paragraph now and then. All of them would mean that few papers ever count.
const READ_SHARE = 0.9;

export async function readProgress(gateway: Gateway, accessToken: string): Promise<{ read: string[] }> {
  const papers = await gateway.progress(accessToken);
  const read = papers
    .filter((paper) => paperById(paper.paperId) && paper.totalParagraphs > 0 && paper.readCount / paper.totalParagraphs >= READ_SHARE)
    .map((paper) => paper.paperId);
  return { read };
}
