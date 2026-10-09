// What follows a signed-in reader to each device: the place, and the reader settings.
// Both live in the reader's preferences in the API. That record is one for all apps, so the
// names start with "hub.". Each value holds the time of its last change: the newer one wins.

import { paperById } from "@/content/paper-index";

export const PLACE_KEY = "hub.place";
export const SETTINGS_KEY = "hub.reader";

export type Place = { paperId: string; sectionId: string; at: number };
export type Settings = { theme: "light" | "dark"; textSize: number; at: number };

// A clock can be wrong. A time more than a day ahead counts as now, so it does not win for good.
const AHEAD_MS = 24 * 60 * 60 * 1000;

function time(value: unknown, now: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return value > now + AHEAD_MS ? now : value;
}

export function parsePlace(value: unknown, now: number = Date.now()): Place | null {
  if (typeof value !== "object" || value === null) return null;
  const { paperId, sectionId, at } = value as Record<string, unknown>;
  if (typeof paperId !== "string" || !paperById(paperId)) return null;
  if (typeof sectionId !== "string" || !/^\d{1,3}$/.test(sectionId)) return null;
  const when = time(at, now);
  return when === null ? null : { paperId, sectionId, at: when };
}

export function parseSettings(value: unknown, now: number = Date.now()): Settings | null {
  if (typeof value !== "object" || value === null) return null;
  const { theme, textSize, at } = value as Record<string, unknown>;
  if (theme !== "light" && theme !== "dark") return null;
  if (typeof textSize !== "number" || !Number.isInteger(textSize) || textSize < 0 || textSize > 4) return null;
  const when = time(at, now);
  return when === null ? null : { theme, textSize, at: when };
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
