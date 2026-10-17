import { describe, expect, it } from "vitest";
import { addDays, computeStreak, goalOn, readingDay } from "./rules";

const TODAY = "2026-10-20";
const ONE = [{ from: "2026-01-01", goal: 1 as const }];
// Counts for the days before today: `pattern` read from the oldest day to yesterday. "x" met, "." none.
function counts(pattern: string, today = TODAY, each = 1): Record<string, number> {
  const out: Record<string, number> = {};
  [...pattern].forEach((mark, i) => {
    if (mark === "x") out[addDays(today, i - pattern.length)] = each;
  });
  return out;
}

describe("readingDay", () => {
  it("starts the day at 4 AM in the zone", () => {
    expect(readingDay(new Date("2026-10-17T05:20:00Z"), "America/Chicago")).toBe("2026-10-16");
    expect(readingDay(new Date("2026-10-17T09:30:00Z"), "America/Chicago")).toBe("2026-10-17");
    expect(readingDay(new Date("2026-10-17T03:59:00Z"), "UTC")).toBe("2026-10-16");
    expect(readingDay(new Date("2026-10-17T04:00:00Z"), "UTC")).toBe("2026-10-17");
  });

  it("uses UTC for a zone that it does not know", () => {
    expect(readingDay(new Date("2026-10-17T12:00:00Z"), "Mars/Base")).toBe("2026-10-17");
  });
});

describe("goalOn", () => {
  it("is the goal that held on that day", () => {
    const goals = [
      { from: "2026-10-01", goal: 1 as const },
      { from: "2026-10-15", goal: 3 as const },
    ];
    expect(goalOn(goals, "2026-10-14")).toBe(1);
    expect(goalOn(goals, "2026-10-15")).toBe(3);
    expect(goalOn(goals, "2026-09-01")).toBe(1);
    expect(goalOn([], "2026-10-15")).toBe(1);
  });
});

describe("computeStreak", () => {
  it("counts the days in a row", () => {
    const state = computeStreak(counts("xxx"), ONE, TODAY, 0);
    expect(state).toMatchObject({ current: 3, longest: 3, todayMet: false, graceReady: true, graceBackIn: 0, endedOn: null });
  });

  it("adds today when today is met, and leaves the count while today is open", () => {
    expect(computeStreak({ ...counts("xxx"), [TODAY]: 1 }, ONE, TODAY, 0)).toMatchObject({ current: 4, todayMet: true });
    expect(computeStreak(counts("xxx"), ONE, TODAY, 0).current).toBe(3);
  });

  it("spends the grace day on one missed day, and does not count it", () => {
    const state = computeStreak(counts("xxx.xx"), ONE, TODAY, 0);
    expect(state).toMatchObject({ current: 5, graceReady: false, graceBackIn: 5, graceUsedOn: addDays(TODAY, -3), endedOn: null });
    expect(state.week.map((cell) => cell.kind)).toEqual(["met", "met", "met", "grace", "met", "met", "today"]);
  });

  it("gives the grace day back after 7 more counted days", () => {
    expect(computeStreak(counts("xx.xxxxxx"), ONE, TODAY, 0)).toMatchObject({ graceReady: false, graceBackIn: 1 });
    expect(computeStreak(counts("xx.xxxxxxx"), ONE, TODAY, 0)).toMatchObject({ graceReady: true, graceBackIn: 0, current: 9 });
  });

  it("ends the streak on a second missed day in a row", () => {
    const state = computeStreak(counts("xxxxx.."), ONE, TODAY, 0);
    expect(state).toMatchObject({ current: 0, longest: 5, endedOn: addDays(TODAY, -1), graceReady: true });
  });

  it("ends the streak on a missed day when the grace day is spent", () => {
    const state = computeStreak(counts("xx.xx.x"), ONE, TODAY, 0);
    expect(state).toMatchObject({ current: 1, endedOn: addDays(TODAY, -2) });
  });

  it("starts a new streak with the grace day ready", () => {
    const state = computeStreak(counts("xx..xx.x"), ONE, TODAY, 0);
    expect(state).toMatchObject({ current: 3, graceReady: false, endedOn: addDays(TODAY, -5) });
  });

  it("judges each day by the goal of that day", () => {
    const goals = [
      { from: "2026-01-01", goal: 1 as const },
      { from: addDays(TODAY, -1), goal: 3 as const },
    ];
    // Two days of one section, then yesterday one section under a goal of three.
    expect(computeStreak(counts("xxx"), goals, TODAY, 0)).toMatchObject({ current: 2, graceUsedOn: addDays(TODAY, -1) });
    expect(computeStreak(counts("xxx", TODAY, 3), goals, TODAY, 0).current).toBe(3);
  });

  it("never gives a longest streak below the one stored", () => {
    expect(computeStreak(counts("xx"), ONE, TODAY, 31).longest).toBe(31);
    expect(computeStreak({}, ONE, TODAY, 0)).toMatchObject({ current: 0, longest: 0, lastMet: null });
  });

  it("marks the week before any reading as none", () => {
    expect(computeStreak({ [TODAY]: 1 }, ONE, TODAY, 0).week.map((cell) => cell.kind)).toEqual([
      "none",
      "none",
      "none",
      "none",
      "none",
      "none",
      "met",
    ]);
  });
});
