// @vitest-environment node
import { describe, expect, it } from "vitest";
import { addDays } from "@/streak/rules";
import { streakNotice } from "./streak-text";

// 11 PM in Chicago on 2026-10-20: the reading day is 2026-10-20.
const NOW = new Date("2026-10-21T04:00:00Z");
const TODAY = "2026-10-20";
const settings = (over: object = {}) => ({ on: true, asked: true, goal: 1, goals: [{ from: "2026-09-01", goal: 1 }], hour: 23, zone: "America/Chicago", since: "2026-09-01", longest: 0, marks: {}, at: 1, ...over });
// "x" met, "." none, from the oldest day to yesterday.
const days = (pattern: string, count = 1) =>
  [...pattern].flatMap((mark, i) => (mark === "x" ? [{ day: addDays(TODAY, i - pattern.length), count }] : []));
const last = { day: addDays(TODAY, -1), paperId: "3", sectionId: "3" };
const reader = (over: object = {}) => ({ streak: settings(), sectionDays: days("xxxxxxxxxxxx"), lastSection: last, ...over });

describe("the streak push", () => {
  it("asks to keep the streak, and names the next section by its title", () => {
    expect(streakNotice(reader(), NOW)).toEqual({
      key: TODAY,
      title: "Keep your 12-day streak 🔥",
      body: "Listen to “God’s Limitlessness” before you sleep · about 7 minutes",
      path: "/papers/paper-3-the-attributes-of-god#3:4",
    });
  });

  it("says that the grace day saved the streak, the day after it was used", () => {
    const notice = streakNotice(reader({ sectionDays: days("xxxxxxxxxxxx.") }), NOW);
    expect(notice?.title).toBe("Your grace day saved your 12-day streak");
    expect(notice?.body).toBe("Miss one more day and it ends. Next: “God’s Limitlessness” · about 7 minutes");
  });

  it("says that the streak ended, the day after it ended", () => {
    const notice = streakNotice(reader({ sectionDays: days("xxxxxxxxxxxx..") }), NOW);
    expect(notice?.title).toBe("Your 12-day streak ended");
    expect(notice?.body).toBe("Start a new one tonight with “God’s Limitlessness” · about 7 minutes");
  });

  it("asks for a new streak on the later nights, and once a week after 7 nights", () => {
    const later = streakNotice(reader({ sectionDays: days("xxxx...") }), NOW);
    expect(later?.title).toBe("Start a new streak tonight");
    expect(later?.body).toBe("“God’s Limitlessness” is next · about 7 minutes");
    expect(streakNotice(reader({ sectionDays: days("xxxx........") }), NOW)).toBeNull();
    expect(streakNotice(reader({ sectionDays: days("xxxx.............") }), NOW)?.title).toBe("Start a new streak tonight");
  });

  it("names the sections that are left of a larger goal, and the time of them", () => {
    const goals = { goal: 2, goals: [{ from: "2026-09-01", goal: 2 }] };
    const notice = streakNotice(reader({ streak: settings(goals), sectionDays: days("xxxxxxxxxxxx", 2) }), NOW);
    expect(notice?.body).toBe("Listen to 2 sections before you sleep, from “God’s Limitlessness” · about 19 minutes");
    const half = streakNotice(reader({ streak: settings(goals), sectionDays: [...days("xxxxxxxxxxxx", 2), { day: TODAY, count: 1 }] }), NOW);
    expect(half?.body).toBe("Listen to “God’s Limitlessness” before you sleep · about 7 minutes");
  });

  it("sends nothing on a day with the goal met, at another hour, or with the streak off", () => {
    expect(streakNotice(reader({ sectionDays: [...days("xxx"), { day: TODAY, count: 1 }] }), NOW)).toBeNull();
    expect(streakNotice(reader(), new Date("2026-10-21T03:00:00Z"))).toBeNull();
    expect(streakNotice(reader({ streak: settings({ on: false }) }), NOW)).toBeNull();
    expect(streakNotice(reader({ streak: "x" }), NOW)).toBeNull();
  });

  it("starts at the Foreword for a reader with no finished section", () => {
    const notice = streakNotice(reader({ sectionDays: [], lastSection: null }), NOW);
    expect(notice?.title).toBe("Start a new streak tonight");
    expect(notice?.path).toBe("/papers/foreword#paper-top");
  });

  it("uses the reading day for an hour after midnight", () => {
    const late = streakNotice(reader({ streak: settings({ hour: 1 }) }), new Date("2026-10-21T06:00:00Z"));
    expect(late?.key).toBe(TODAY);
  });

  it("speaks Spanish to a Spanish reader, with the Spanish title and link", () => {
    const notice = streakNotice(reader(), NOW, "es");
    expect(notice?.title).toBe("Mantén tu racha de 12 días 🔥");
    expect(notice?.body).toMatch(/^Escucha “[^”]+” antes de dormir · unos 7 minutos$/);
    expect(notice?.body).not.toContain("God’s Limitlessness");
    expect(notice?.path).toMatch(/^\/es\/documentos\/documento-3-[^#]+#3:4$/);
    expect(streakNotice(reader({ sectionDays: days("xxxxxxxxxxxx..") }), NOW, "es")?.title).toBe("Tu racha de 12 días terminó");
    expect(streakNotice(reader({ sectionDays: days("xxxx...") }), NOW, "es")?.title).toBe("Empieza una racha nueva esta noche");
  });
});
