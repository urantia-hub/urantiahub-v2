// The streak push: one a night at most, at the reader's streak hour, on a day with the goal not met.
// Each text names the streak and the next section by its title (spec §3.6, mock screen 2).

import { paperPath } from "@/content/paper-index";
import { BOOK, minutesOf, nextAfter, type SectionEntry } from "@/content/section-index";
import { labelIn, parseStreak } from "@/account/streak-data";
import type { Lang } from "@/i18n/lang";
import { anchorFor } from "@/lib/paper-url";
import { addDays, computeStreak, goalOn, readingDay } from "@/streak/rules";

export type StreakReader = { streak: unknown; sectionDays: { day: string; count: number }[]; lastSection: { paperId: string; sectionId: string } | null };
export type StreakPush = { key: string; title: string; body: string; path: string };

// After a week with no section, the push comes once a week, so the Hub does not nag.
const QUIET_AFTER = 7;
// The hour in the reader's zone. A zone that the runtime does not know counts as UTC.
function hourIn(now: Date, zone: string): number {
  const read = (timeZone: string) => Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(now));
  try {
    return read(zone);
  } catch {
    return read("UTC");
  }
}
const days = (n: number, lang: Lang) => (lang === "es" ? `${n} ${n === 1 ? "día" : "días"}` : `${n}-day`);
// The words of the push in each language. `from`: the first section of a run of more than one.
const WORDS = {
  en: {
    sections: (n: number) => `${n} sections`,
    time: (minutes: number) => `about ${minutes} minutes`,
    from: (what: string, name: string) => `${what} from ${name}`,
    graceTitle: (n: number) => `Your grace day saved your ${days(n, "en")} streak`,
    graceBody: (next: string) => `Miss one more day and it ends. Next: ${next}`,
    keepTitle: (n: number) => `Keep your ${days(n, "en")} streak 🔥`,
    keepBody: (what: string, from: string) => `Listen to ${what} before you sleep${from ? `, from ${from}` : ""}`,
    endedTitle: (n: number) => `Your ${days(n, "en")} streak ended`,
    endedBody: (next: string) => `Start a new one tonight with ${next}`,
    newTitle: "Start a new streak tonight",
    newBody: (one: boolean, next: string) => (one ? `${next} is next` : `${next} are next`),
  },
  es: {
    sections: (n: number) => `${n} secciones`,
    time: (minutes: number) => `unos ${minutes} minutos`,
    from: (what: string, name: string) => `${what} desde ${name}`,
    graceTitle: (n: number) => `Tu día de gracia salvó tu racha de ${days(n, "es")}`,
    graceBody: (next: string) => `Un día más sin leer y termina. Siguiente: ${next}`,
    keepTitle: (n: number) => `Mantén tu racha de ${days(n, "es")} 🔥`,
    keepBody: (what: string, from: string) => `Escucha ${what} antes de dormir${from ? `, desde ${from}` : ""}`,
    endedTitle: (n: number) => `Tu racha de ${days(n, "es")} terminó`,
    endedBody: (next: string) => `Empieza una nueva esta noche con ${next}`,
    newTitle: "Empieza una racha nueva esta noche",
    newBody: (one: boolean, next: string) => (one ? `${next} es la siguiente` : `${next} son las siguientes`),
  },
};
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);

// `lang`: the language of the reader. The section is named by its title in that language.
export function streakNotice(reader: StreakReader, now: Date, lang: Lang = "en"): StreakPush | null {
  const w = WORDS[lang];
  const settings = parseStreak(reader.streak);
  if (!settings?.on) return null;
  if (hourIn(now, settings.zone) !== settings.hour) return null;
  const today = readingDay(now, settings.zone);
  const counts = Object.fromEntries(reader.sectionDays.map(({ day, count }) => [day, count]));
  const state = computeStreak(counts, settings.goals, today, settings.longest);
  if (state.todayMet) return null;

  const yesterday = addDays(today, -1);
  if (state.current === 0 && state.endedOn !== yesterday) {
    // The nights since the last section, or since the yes when none is in the list.
    const off = daysBetween(state.lastMet ?? settings.since ?? today, today);
    if (off > QUIET_AFTER && off % QUIET_AFTER !== 0) return null;
  }

  // The sections that are left of today's goal, from the next one in the book.
  const left = Math.max(1, goalOn(settings.goals, today) - (counts[today] ?? 0));
  const first = reader.lastSection ? nextAfter(reader.lastSection.paperId, reader.lastSection.sectionId) : BOOK[0];
  const run: SectionEntry[] = [first];
  while (run.length < left) run.push(nextAfter(run.at(-1)!.paperId, run.at(-1)!.id));
  const minutes = run.reduce((sum, entry) => sum + minutesOf(entry.words), 0);
  const name = `“${labelIn(first, lang).title}”`;
  const what = left === 1 ? name : w.sections(left);
  const next = left === 1 ? name : w.from(what, name);
  const time = w.time(minutes);
  const path = `${paperPath(first.paperId, lang)}${anchorFor({ paperId: first.paperId, sectionId: first.id })}`;

  const text = (title: string, body: string) => ({ key: today, title, body: `${body} · ${time}`, path });
  if (state.current > 0 && state.graceUsedOn === yesterday) return text(w.graceTitle(state.current), w.graceBody(next));
  if (state.current > 0) return text(w.keepTitle(state.current), w.keepBody(what, left === 1 ? "" : name));
  if (state.endedOn === yesterday) return text(w.endedTitle(state.endedLength), w.endedBody(next));
  return text(w.newTitle, w.newBody(left === 1, next));
}
