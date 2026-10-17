// The streak push: one a night at most, at the reader's streak hour, on a day with the goal not met.
// Each text names the streak and the next section by its title (spec §3.6, mock screen 2).

import { paperPath } from "@/content/paper-index";
import { BOOK, minutesOf, nextAfter, type SectionEntry, sectionLabel } from "@/content/section-index";
import { parseStreak } from "@/account/streak-data";
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
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);

export function streakNotice(reader: StreakReader, now: Date): StreakPush | null {
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
  const name = `“${sectionLabel(first).title}”`;
  const what = left === 1 ? name : `${left} sections`;
  const time = `about ${minutes} minutes`;
  const path = `${paperPath(first.paperId)}${anchorFor({ paperId: first.paperId, sectionId: first.id })}`;

  const text = (title: string, body: string) => ({ key: today, title, body: `${body} · ${time}`, path });
  if (state.current > 0 && state.graceUsedOn === yesterday)
    return text(`Your grace day saved your ${state.current}-day streak`, `Miss one more day and it ends. Next: ${left === 1 ? name : `${what} from ${name}`}`);
  if (state.current > 0) return text(`Keep your ${state.current}-day streak 🔥`, `Listen to ${what} before you sleep${left === 1 ? "" : `, from ${name}`}`);
  if (state.endedOn === yesterday) return text(`Your ${state.endedLength}-day streak ended`, `Start a new one tonight with ${left === 1 ? name : `${what} from ${name}`}`);
  return text("Start a new streak tonight", left === 1 ? `${name} is next` : `${what} from ${name} are next`);
}
