// What follows a signed-in reader to each device: the place and the language. They live in the reader's preferences
// in the API. That record is one for all apps, so each name starts with "hub.". Each value holds the
// time of its last change: the newer one wins.

import { paperById } from "@/content/paper-index";
import type { Lang } from "@/i18n/lang";

export const PLACE_KEY = "hub.place";
// The language that the reader chose last, on any device.
export const LANG_KEY = "hub.lang";

// The label is the title of the section, for the "Continue" card. React shows it as text.
export type Place = { paperId: string; sectionId: string; at: number; label: string | null };

// A clock can be wrong. A time more than a day ahead counts as now, so it does not win for good.
const AHEAD_MS = 24 * 60 * 60 * 1000;

function time(value: unknown, now: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return value > now + AHEAD_MS ? now : value;
}

export function parsePlace(value: unknown, now: number = Date.now()): Place | null {
  if (typeof value !== "object" || value === null) return null;
  const { paperId, sectionId, at, label } = value as Record<string, unknown>;
  if (typeof paperId !== "string" || !paperById(paperId)) return null;
  if (typeof sectionId !== "string" || !/^\d{1,3}$/.test(sectionId)) return null;
  const when = time(at, now);
  return when === null ? null : { paperId, sectionId, at: when, label: typeof label === "string" && label.length <= 120 ? label : null };
}

export type LangChoice = { lang: Lang; at: number };

export function parseLang(value: unknown, now: number = Date.now()): LangChoice | null {
  if (typeof value !== "object" || value === null) return null;
  const { lang, at } = value as Record<string, unknown>;
  if (lang !== "en" && lang !== "es") return null;
  const when = time(at, now);
  return when === null ? null : { lang, at: when };
}

// Which value wins, and where it came from. "browser": send it to the account. "account": apply it
// in this browser. "same" and "none": nothing to do.
export function newer<T extends { at: number }>(
  browser: T | null,
  account: T | null,
): { value: T | null; from: "browser" | "account" | "same" | "none" } {
  if (!browser && !account) return { value: null, from: "none" };
  if (!account) return { value: browser, from: "browser" };
  if (!browser) return { value: account, from: "account" };
  if (browser.at === account.at) return { value: browser, from: "same" };
  return browser.at > account.at ? { value: browser, from: "browser" } : { value: account, from: "account" };
}
