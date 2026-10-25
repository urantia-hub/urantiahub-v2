// Which notices a reader gets now. The job runs each 15 minutes and asks this for each reader.
// A notice that is due in a run is claimed in the account first, so it goes out one time.

import passages from "@/content/daily-passages.json";
import { paperById } from "@/content/paper-index";
import type { Lang } from "@/i18n/lang";
import { streakNotice, type StreakPush } from "./streak-text";

export type Kind = "daily" | "reminder" | "releases" | "streak";
export type Channel = "email" | "push";
export type Device = { endpoint: string; p256dh: string; auth: string; kinds: string[] };
// A reader as the API lists it for the job.
export type Reader = {
  userId: string;
  email: string | null;
  // `push` is absent in a record from before push was a setting of the account.
  settings: { email: Partial<Record<Kind, boolean>>; push?: Partial<Record<Kind, boolean>>; hour: number; zone: string } | null;
  place: unknown;
  // The language that the reader chose (`hub.lang`). Absent in a list from before the API gave it.
  lang?: "en" | "es";
  // The streak (`hub.streak`), the count of finished sections of each recent day, and the last one.
  streak?: unknown;
  sectionDays?: { day: string; count: number }[];
  lastSection?: { paperId: string; sectionId: string } | null;
  devices: Device[];
};
export type Due = {
  userId: string;
  kind: Kind;
  channel: Channel;
  // What makes this notice one notice: the local date, the time of the place that the reader left,
  // or the date of the release.
  key: string;
  email: string | null;
  devices: Device[];
  place: { paperId: string; sectionId: string } | null;
  // The language of the words and the links of the notice.
  lang: Lang;
  // The text of a streak push, made with the rules of the streak.
  streak?: StreakPush;
};

const DEFAULT_HOUR = 7;
const DAY_MS = 86_400_000;
const REMINDER_AFTER_DAYS = 7;
const REMINDER_UNTIL_DAYS = 30;
// The reminder and the release notice come in the day of the reader only.
const DAY_STARTS = 9;
const DAY_ENDS = 20;

// The date and the hour in a time zone. A zone that the runtime does not know counts as UTC.
export function localTime(now: Date, zone: string): { date: string; hour: number } {
  const read = (timeZone: string) => {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(now);
    const of = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    return { date: `${of("year")}-${of("month")}-${of("day")}`, hour: Number(of("hour")) };
  };
  try {
    return read(zone);
  } catch {
    return read("UTC");
  }
}

function placeOf(value: unknown): { paperId: string; sectionId: string; at: number } | null {
  if (typeof value !== "object" || value === null) return null;
  const { paperId, sectionId, at } = value as Record<string, unknown>;
  if (typeof paperId !== "string" || !paperById(paperId) || typeof sectionId !== "string" || !/^\d{1,3}$/.test(sectionId)) return null;
  return typeof at === "number" && Number.isFinite(at) ? { paperId, sectionId, at } : null;
}

// `news`: the release that readers hear of now, or none.
export function dueNotices(reader: Reader, now: Date, news: { date: string } | null = null): Due[] {
  const zone = reader.settings?.zone ?? "UTC";
  const local = localTime(now, zone);
  const due: Due[] = [];
  const lang = reader.lang ?? "en";
  const add = (kind: Kind, key: string, place: Due["place"]) => {
    const base = { userId: reader.userId, kind, key, place, lang };
    if (reader.email && reader.settings?.email[kind]) due.push({ ...base, channel: "email", email: reader.email, devices: [] });
    // A push goes to each device of the reader.
    if (reader.settings?.push?.[kind] && reader.devices.length > 0) due.push({ ...base, channel: "push", email: null, devices: reader.devices });
  };

  if (local.hour === (reader.settings?.hour ?? DEFAULT_HOUR)) add("daily", local.date, null);

  const day = local.hour >= DAY_STARTS && local.hour < DAY_ENDS;
  if (news && day) add("releases", news.date, null);

  const place = placeOf(reader.place);
  if (place && day) {
    const days = (now.getTime() - place.at) / DAY_MS;
    if (days >= REMINDER_AFTER_DAYS && days <= REMINDER_UNTIL_DAYS) add("reminder", String(place.at), { paperId: place.paperId, sectionId: place.sectionId });
  }
  // The streak goes as a push only, at its own hour, outside the window of the day.
  if (reader.settings?.push?.streak && reader.devices.length > 0) {
    const streak = streakNotice({ streak: reader.streak, sectionDays: reader.sectionDays ?? [], lastSection: reader.lastSection ?? null }, now);
    if (streak) due.push({ userId: reader.userId, kind: "streak", channel: "push", key: streak.key, email: null, devices: reader.devices, place: null, lang, streak });
  }
  return due;
}

const FIRST_DAY = Date.UTC(2026, 0, 1);

// The reference of the passage of a date ("2026-10-11"). The same for each reader on that date.
export function passageFor(date: string, list: readonly string[] = passages): string {
  const day = Math.round((Date.parse(`${date}T00:00:00Z`) - FIRST_DAY) / DAY_MS);
  const index = Number.isFinite(day) ? ((day % list.length) + list.length) % list.length : 0;
  return list[index];
}
