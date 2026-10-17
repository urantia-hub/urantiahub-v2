// The rules of the streak, with no clock and no storage: each function gets the days and answers.
// A reading day starts at 4 AM in the reader's zone. One missed day inside a streak spends the grace
// day; a second one in a row ends the streak. The grace day returns after 7 more counted days.

export type Goal = 1 | 2 | 3;
export type Goals = { from: string; goal: Goal }[];
export type DayKind = "met" | "grace" | "missed" | "today" | "none";
export type StreakState = {
  current: number;
  longest: number;
  todayMet: boolean;
  graceReady: boolean;
  // Counted days still needed for the grace day to return. 0 when it is ready.
  graceBackIn: number;
  graceUsedOn: string | null;
  // The day on which the last streak ended, if one ended.
  endedOn: string | null;
  lastMet: string | null;
  // The last 7 reading days, the oldest first, today last.
  week: { day: string; kind: DayKind }[];
};

const DAY_STARTS_AT = 4;
export const GRACE_RETURNS_AFTER = 7;

export function addDays(day: string, n: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

// The reading day of a moment in a zone. A zone that the runtime does not know counts as UTC.
export function readingDay(now: Date, zone: string): string {
  const shifted = new Date(now.getTime() - DAY_STARTS_AT * 3_600_000);
  const read = (timeZone: string) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(shifted);
  try {
    return read(zone);
  } catch {
    return read("UTC");
  }
}

// The goal that held on a day: the last change at or before it, else the first goal, else 1.
export function goalOn(goals: Goals, day: string): Goal {
  let goal: Goal = goals[0]?.goal ?? 1;
  for (const change of [...goals].sort((a, b) => a.from.localeCompare(b.from))) if (change.from <= day) goal = change.goal;
  return goal;
}

// The streak from the count of finished sections of each reading day.
export function computeStreak(counts: Record<string, number>, goals: Goals, today: string, storedLongest: number): StreakState {
  const met = (day: string) => (counts[day] ?? 0) >= goalOn(goals, day);
  const days = Object.keys(counts).filter((day) => day <= today && (counts[day] ?? 0) > 0);
  const start = days.length > 0 ? days.reduce((a, b) => (a < b ? a : b)) : null;

  let current = 0;
  let longest = 0;
  let graceReady = true;
  let sinceGrace = 0;
  let graceUsedOn: string | null = null;
  let endedOn: string | null = null;
  let lastMet: string | null = null;
  // The day before was the grace day: one more miss ends the streak.
  let graced = false;
  const kinds = new Map<string, DayKind>();

  const count = (day: string) => {
    current += 1;
    longest = Math.max(longest, current);
    lastMet = day;
    graced = false;
    if (!graceReady && ++sinceGrace >= GRACE_RETURNS_AFTER) graceReady = true;
    kinds.set(day, "met");
  };

  for (let day = start; day !== null && day < today; day = addDays(day, 1)) {
    if (met(day)) count(day);
    else if (current > 0 && graceReady && !graced) {
      graceReady = false;
      sinceGrace = 0;
      graceUsedOn = day;
      graced = true;
      kinds.set(day, "grace");
    } else {
      if (current > 0) endedOn = day;
      current = 0;
      graced = false;
      graceReady = true;
      kinds.set(day, "missed");
    }
  }
  const todayMet = met(today);
  if (todayMet) count(today);
  else kinds.set(today, "today");

  const week = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i - 6);
    return { day, kind: kinds.get(day) ?? "none" };
  });
  return {
    current,
    longest: Math.max(longest, storedLongest),
    todayMet,
    graceReady,
    graceBackIn: graceReady ? 0 : GRACE_RETURNS_AFTER - sinceGrace,
    graceUsedOn,
    endedOn,
    lastMet,
    week,
  };
}
