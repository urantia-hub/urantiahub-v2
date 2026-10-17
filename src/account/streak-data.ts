// The streak of a signed-in reader: the settings in `hub.streak`, and the sections that the reader
// finished on each reading day. A browser sends the values, so each function checks them.

import { paperPath } from "@/content/paper-index";
import { BOOK, minutesOf, nextAfter, orderOf, sectionAt, type SectionEntry, sectionLabel, TOTAL_SECTIONS } from "@/content/section-index";
import { anchorFor } from "@/lib/paper-url";
import { addDays, computeStreak, type Goal, type Goals, readingDay, type StreakState } from "@/streak/rules";
import { parsePlace, PLACE_KEY } from "./reader-data";

export const STREAK_KEY = "hub.streak";
export const DEFAULT_STREAK_HOUR = 21;

export type StreakSettings = {
  on: boolean;
  asked: boolean;
  goal: Goal;
  goals: Goals;
  hour: number;
  zone: string;
  since: string | null;
  longest: number;
  // A mark's id and the time it was earned. Written by the marks, kept by each other change.
  marks: Record<string, string>;
  at: number;
};
export type SectionRow = { day: string; paperId: string; sectionId: string; how: "read" | "heard" };
export type NextSection = { paperId: string; sectionId: string; title: string; paper: string; minutes: number; href: string };
export type StreakCard =
  | { on: false; asked: boolean }
  | { on: true; state: StreakState; goal: Goal; hour: number; book: { done: number; total: number }; next: NextSection };

export type StreakGateway = {
  preferences(accessToken: string): Promise<Record<string, unknown>>;
  savePreferences(accessToken: string, patch: Record<string, unknown>): Promise<void>;
  sectionDays(accessToken: string): Promise<SectionRow[]>;
  addSectionDays(accessToken: string, rows: SectionRow[]): Promise<void>;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isGoal = (value: unknown): value is Goal => value === 1 || value === 2 || value === 3;
const isHour = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 23;
const isDay = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

function isZone(value: unknown): value is string {
  if (typeof value !== "string" || value === "" || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function parseStreak(value: unknown): StreakSettings | null {
  if (!isRecord(value)) return null;
  const goals = Array.isArray(value.goals) ? value.goals.filter((g): g is Goals[number] => isRecord(g) && isDay(g.from) && isGoal(g.goal)) : [];
  const marks = isRecord(value.marks) ? Object.fromEntries(Object.entries(value.marks).filter(([, at]) => typeof at === "string")) : {};
  return {
    on: value.on === true,
    asked: value.asked === true,
    goal: isGoal(value.goal) ? value.goal : 1,
    goals,
    hour: isHour(value.hour) ? value.hour : DEFAULT_STREAK_HOUR,
    zone: isZone(value.zone) ? value.zone : "UTC",
    since: isDay(value.since) ? value.since : null,
    longest: typeof value.longest === "number" && Number.isInteger(value.longest) && value.longest >= 0 ? value.longest : 0,
    marks: marks as Record<string, string>,
    at: typeof value.at === "number" ? value.at : 0,
  };
}

const fresh = (now: number): StreakSettings => ({ on: false, asked: false, goal: 1, goals: [], hour: DEFAULT_STREAK_HOUR, zone: "UTC", since: null, longest: 0, marks: {}, at: now });

// A change names only the fields that it changes. A field that is not valid refuses the whole change.
export async function changeStreak(gateway: StreakGateway, accessToken: string, value: unknown, now: Date = new Date()): Promise<{ saved: boolean }> {
  if (!isRecord(value)) return { saved: false };
  const { on, asked, goal, hour, zone } = value;
  if ((on !== undefined && typeof on !== "boolean") || (asked !== undefined && asked !== true)) return { saved: false };
  if ((goal !== undefined && !isGoal(goal)) || (hour !== undefined && !isHour(hour)) || (zone !== undefined && !isZone(zone))) return { saved: false };
  if ([on, asked, goal, hour, zone].every((field) => field === undefined)) return { saved: false };

  const stored = parseStreak((await gateway.preferences(accessToken))[STREAK_KEY]) ?? fresh(now.getTime());
  const next: StreakSettings = { ...stored, at: now.getTime() };
  if (zone !== undefined) next.zone = zone;
  if (hour !== undefined) next.hour = hour;
  if (asked === true) next.asked = true;
  const today = readingDay(now, next.zone);
  if (on !== undefined) next.on = on;
  // The day of the first yes: the whole-book count starts there, and it never moves.
  if (next.on && next.since === null) next.since = today;
  if (goal !== undefined && goal !== stored.goal) next.goal = goal;
  // The goal of a day stays the goal it had: a change holds from the next reading day.
  if (next.goals.length === 0) next.goals = [{ from: today, goal: next.goal }];
  else if (goal !== undefined && goal !== stored.goal) next.goals = [...next.goals.filter((g) => g.from <= today), { from: addDays(today, 1), goal }];
  await gateway.savePreferences(accessToken, { [STREAK_KEY]: next });
  return { saved: true };
}

function parseRow(value: unknown): SectionRow | null {
  if (!isRecord(value)) return null;
  const { day, paperId, sectionId, how } = value;
  if (!isDay(day) || typeof paperId !== "string" || typeof sectionId !== "string") return null;
  if (how !== "read" && how !== "heard") return null;
  return sectionAt(paperId, sectionId) ? { day, paperId, sectionId, how } : null;
}

const MAX_ROWS = 50;

// Finished sections from the browser. Only today and yesterday count: a queue that waited in a
// browser with no connection can still arrive the next morning.
export async function saveSections(gateway: StreakGateway, accessToken: string, value: unknown, now: Date = new Date()): Promise<{ added: number; card: StreakCard }> {
  const all = await gateway.preferences(accessToken);
  const settings = parseStreak(all[STREAK_KEY]);
  const given = isRecord(value) && Array.isArray(value.rows) ? value.rows.slice(0, MAX_ROWS) : [];
  if (!settings?.on) return { added: 0, card: await cardFor(gateway, accessToken, all, now) };
  const today = readingDay(now, settings.zone);
  const rows = given.map(parseRow).filter((row): row is SectionRow => row !== null && (row.day === today || row.day === addDays(today, -1)));
  if (rows.length > 0) await gateway.addSectionDays(accessToken, rows);
  return { added: rows.length, card: await cardFor(gateway, accessToken, all, now) };
}

export async function readStreak(gateway: StreakGateway, accessToken: string, now: Date = new Date()): Promise<StreakCard> {
  return cardFor(gateway, accessToken, await gateway.preferences(accessToken), now);
}

function hrefOf(entry: SectionEntry): string {
  return `${paperPath(entry.paperId)}${anchorFor({ paperId: entry.paperId, sectionId: entry.id })}`;
}

function nextSection(rows: SectionRow[], place: unknown): NextSection {
  // The section after the one that the reader finished last: the newest day, and in it the furthest one.
  const last = rows.reduce<SectionRow | null>((best, row) => {
    if (!best || row.day > best.day) return row;
    return row.day === best.day && orderOf(row.paperId, row.sectionId) > orderOf(best.paperId, best.sectionId) ? row : best;
  }, null);
  const at = parsePlace(place);
  const entry = last ? nextAfter(last.paperId, last.sectionId) : ((at && sectionAt(at.paperId, at.sectionId)) ?? BOOK[0]);
  return { paperId: entry.paperId, sectionId: entry.id, ...sectionLabel(entry), minutes: minutesOf(entry.words), href: hrefOf(entry) };
}

async function cardFor(gateway: StreakGateway, accessToken: string, all: Record<string, unknown>, now: Date): Promise<StreakCard> {
  const settings = parseStreak(all[STREAK_KEY]);
  if (!settings?.on) return { on: false, asked: settings?.asked ?? false };
  const rows = await gateway.sectionDays(accessToken);
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.day] = (counts[row.day] ?? 0) + 1;
  const state = computeStreak(counts, settings.goals, readingDay(now, settings.zone), settings.longest);
  if (state.longest > settings.longest) await gateway.savePreferences(accessToken, { [STREAK_KEY]: { ...settings, longest: state.longest } });
  const done = new Set(rows.map((row) => `${row.paperId}:${row.sectionId}`)).size;
  return { on: true, state, goal: settings.goal, hour: settings.hour, book: { done, total: TOTAL_SECTIONS }, next: nextSection(rows, all[PLACE_KEY]) };
}
