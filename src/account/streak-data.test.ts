// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { changeStreak, earnTool, parseStreak, readStreak, saveSections, saveTextPage, type StreakGateway } from "./streak-data";

// 10 AM in Chicago: the reading day is 2026-10-17.
const NOW = new Date("2026-10-17T15:00:00Z");
const ZONE = "America/Chicago";
type Row = { day: string; paperId: string; sectionId: string; how: "read" | "heard" };

function gateway(stored: Record<string, unknown> = {}, rows: Row[] = []): StreakGateway & { saved: Record<string, unknown>[]; added: Row[][] } {
  const saved: Record<string, unknown>[] = [];
  const added: Row[][] = [];
  const prefs = { ...stored };
  return {
    saved,
    added,
    preferences: vi.fn(async () => prefs),
    savePreferences: vi.fn(async (_token, patch) => {
      saved.push(patch);
      Object.assign(prefs, patch);
    }),
    sectionDays: vi.fn(async () => rows),
    addSectionDays: vi.fn(async (_token, given: Row[]) => {
      added.push(given);
      rows.push(...given);
    }),
  };
}

const on = (over: object = {}) => ({
  "hub.streak": { on: true, asked: true, goal: 1, goals: [{ from: "2026-10-01", goal: 1 }], hour: 23, zone: ZONE, since: "2026-10-01", longest: 0, marks: {}, at: 1, ...over },
});

describe("parseStreak", () => {
  it("keeps the known fields and refuses a broken value", () => {
    expect(parseStreak(on()["hub.streak"])).toMatchObject({ on: true, goal: 1, hour: 23, zone: ZONE });
    expect(parseStreak("x")).toBeNull();
    expect(parseStreak({ on: true, goal: 7 })).toMatchObject({ goal: 1, hour: 21, zone: "UTC", goals: [] });
  });
});

describe("a change of the streak settings", () => {
  it("turns it on with the day of the yes, and keeps that day", async () => {
    const g = gateway();
    expect(await changeStreak(g, "t", { on: true, asked: true, goal: 2, zone: ZONE, hour: 21 }, NOW)).toEqual({ saved: true });
    expect(g.saved[0]["hub.streak"]).toMatchObject({ on: true, asked: true, goal: 2, goals: [{ from: "2026-10-17", goal: 2 }], since: "2026-10-17", hour: 21, zone: ZONE });
    await changeStreak(g, "t", { on: false }, new Date("2026-10-20T15:00:00Z"));
    await changeStreak(g, "t", { on: true }, new Date("2026-10-21T15:00:00Z"));
    expect(g.saved.at(-1)?.["hub.streak"]).toMatchObject({ on: true, since: "2026-10-17" });
  });

  it("applies a new goal from the next reading day", async () => {
    const g = gateway(on());
    await changeStreak(g, "t", { goal: 3 }, NOW);
    expect(g.saved[0]["hub.streak"]).toMatchObject({ goal: 3, goals: [{ from: "2026-10-01", goal: 1 }, { from: "2026-10-18", goal: 3 }] });
  });

  it("writes nothing for a value that is not valid", async () => {
    const g = gateway(on());
    expect(await changeStreak(g, "t", { goal: 4 }, NOW)).toEqual({ saved: false });
    expect(await changeStreak(g, "t", { zone: "Mars/Base" }, NOW)).toEqual({ saved: false });
    expect(await changeStreak(g, "t", { hour: 24 }, NOW)).toEqual({ saved: false });
    expect(await changeStreak(g, "t", "x", NOW)).toEqual({ saved: false });
    expect(g.saved).toEqual([]);
  });
});

describe("a save of finished sections", () => {
  it("adds the rows of today and yesterday for a section that exists", async () => {
    const g = gateway(on());
    const rows = [
      { day: "2026-10-17", paperId: "3", sectionId: "4", how: "read" },
      { day: "2026-10-16", paperId: "3", sectionId: "3", how: "heard" },
      { day: "2026-10-14", paperId: "3", sectionId: "2", how: "read" },
      { day: "2026-10-17", paperId: "3", sectionId: "99", how: "read" },
      { day: "2026-10-17", paperId: "3", sectionId: "5", how: "skimmed" },
    ];
    const answer = await saveSections(g, "t", { rows }, NOW);
    expect(g.added).toEqual([[rows[0], rows[1]]]);
    expect(answer).toMatchObject({ added: 2, card: { on: true, state: { current: 2, todayMet: true } } });
  });

  it("adds nothing while the streak is off", async () => {
    const g = gateway(on({ on: false }));
    expect(await saveSections(g, "t", { rows: [{ day: "2026-10-17", paperId: "3", sectionId: "4", how: "read" }] }, NOW)).toMatchObject({ added: 0 });
    expect(g.added).toEqual([]);
  });
});

describe("the streak card", () => {
  it("is off, with the question state, for a reader who did not say yes", async () => {
    expect(await readStreak(gateway(), "t", NOW)).toEqual({ on: false, asked: false });
    expect(await readStreak(gateway(on({ on: false })), "t", NOW)).toEqual({ on: false, asked: true });
  });

  it("names the next section by its title, and counts the book", async () => {
    const rows: Row[] = [
      { day: "2026-10-15", paperId: "3", sectionId: "3", how: "read" },
      { day: "2026-10-16", paperId: "3", sectionId: "4", how: "read" },
      { day: "2026-10-16", paperId: "3", sectionId: "3", how: "read" },
    ];
    const card = await readStreak(gateway(on(), rows), "t", NOW);
    expect(card).toMatchObject({
      on: true,
      goal: 1,
      hour: 23,
      book: { done: 2, total: 1626 },
      next: { paperId: "3", sectionId: "5", title: "The Father’s Supreme Rule", paper: "The Attributes of God", href: "/papers/paper-3-the-attributes-of-god#3:5" },
      state: { current: 2, todayMet: false },
    });
    expect(card.on && card.next.minutes).toBeGreaterThan(0);
  });

  it("starts at the reader's place, else at the Foreword", async () => {
    const atPlace = await readStreak(gateway({ ...on(), "hub.place": { paperId: "5", sectionId: "2", at: 1 } }), "t", NOW);
    expect(atPlace.on && atPlace.next).toMatchObject({ paperId: "5", sectionId: "2" });
    const fresh = await readStreak(gateway(on()), "t", NOW);
    expect(fresh.on && fresh.next).toMatchObject({ paperId: "0", sectionId: "0", href: "/papers/foreword#paper-top" });
  });

  it("writes back a longest streak that grew, and never lowers it", async () => {
    const rows: Row[] = ["2026-10-14", "2026-10-15", "2026-10-16"].map((day) => ({ day, paperId: "1", sectionId: "1", how: "read" }));
    const g = gateway(on({ longest: 2 }), rows);
    expect(await readStreak(g, "t", NOW)).toMatchObject({ state: { longest: 3 } });
    expect(g.saved.at(-1)?.["hub.streak"]).toMatchObject({ longest: 3 });
    const h = gateway(on({ longest: 31 }), rows);
    expect(await readStreak(h, "t", NOW)).toMatchObject({ state: { longest: 31 } });
    expect(h.saved.every((patch) => (patch["hub.streak"] as { longest: number }).longest === 31)).toBe(true);
  });
});

describe("the marks", () => {
  it("earns a mark from the rows, keeps its first time, and names it as new one time", async () => {
    const rows: Row[] = [{ day: "2026-10-16", paperId: "3", sectionId: "4", how: "heard" }];
    const g = gateway(on(), rows);
    const first = await readStreak(g, "t", NOW);
    expect(first.on && first.fresh).toEqual(["first-section", "first-listen"]);
    expect(g.saved.at(-1)?.["hub.streak"]).toMatchObject({ marks: { "first-section": NOW.toISOString(), "first-listen": NOW.toISOString() } });
    const again = await readStreak(g, "t", new Date("2026-10-18T15:00:00Z"));
    expect(again.on && again.fresh).toEqual([]);
    expect(again.on && again.marks["first-section"]).toBe(NOW.toISOString());
  });

  it("keeps a tool mark only for a known tool, while the streak is on", async () => {
    const g = gateway(on());
    expect(await earnTool(g, "t", { id: "search" }, NOW)).toEqual({ saved: true, fresh: ["search"] });
    expect(await earnTool(g, "t", { id: "search" }, NOW)).toEqual({ saved: true, fresh: [] });
    expect(await earnTool(g, "t", { id: "papers-20" }, NOW)).toEqual({ saved: false, fresh: [] });
    const off = gateway(on({ on: false }));
    expect(await earnTool(off, "t", { id: "search" }, NOW)).toEqual({ saved: false, fresh: [] });
    expect(off.saved).toEqual([]);
  });

  it("keeps the tool marks through each other change of the settings", async () => {
    const g = gateway(on({ marks: { search: "2026-10-01T00:00:00Z" } }));
    await changeStreak(g, "t", { goal: 2 }, NOW);
    expect(g.saved.at(-1)?.["hub.streak"]).toMatchObject({ marks: { search: "2026-10-01T00:00:00Z" } });
  });
});

describe("a finished page of a world text", () => {
  it("is kept in the reader's preferences, and earns its mark", async () => {
    const g = gateway(on());
    const answer = await saveTextPage(g, "t", { work: "dhammapada", page: "1" }, NOW);
    expect(answer.saved).toBe(true);
    expect(g.saved[0]).toEqual({ "hub.texts": { dhammapada: ["1"] } });
    expect(answer.card.on && answer.card.fresh).toEqual(["first-text"]);
  });

  it("keeps each page once, beside the pages of the other works", async () => {
    const g = gateway({ ...on(), "hub.texts": { quran: ["1"] } });
    await saveTextPage(g, "t", { work: "dhammapada", page: "1" }, NOW);
    expect(g.saved[0]).toEqual({ "hub.texts": { quran: ["1"], dhammapada: ["1"] } });
    const writes = g.saved.length;
    expect((await saveTextPage(g, "t", { work: "dhammapada", page: "1" }, NOW)).saved).toBe(true);
    expect(g.saved.slice(writes).some((patch) => "hub.texts" in patch)).toBe(false);
  });

  it("refuses a work or a page that the index does not have, and a value that is broken", async () => {
    for (const value of [{ work: "no-such-work", page: "1" }, { work: "dhammapada", page: "999" }, { work: "dhammapada" }, null, "x"]) {
      const g = gateway(on());
      expect((await saveTextPage(g, "t", value, NOW)).saved, JSON.stringify(value)).toBe(false);
      expect(g.saved.some((patch) => "hub.texts" in patch)).toBe(false);
    }
  });

  it("keeps nothing while the streak is off", async () => {
    const g = gateway(on({ on: false }));
    const answer = await saveTextPage(g, "t", { work: "dhammapada", page: "1" }, NOW);
    expect(answer).toEqual({ saved: false, card: { on: false, asked: true } });
    expect(g.saved).toEqual([]);
  });

  it("reads a stored value that is broken as no pages", async () => {
    const g = gateway({ ...on(), "hub.texts": { dhammapada: "1", quran: [3, "1"] } });
    await saveTextPage(g, "t", { work: "japji", page: "1" }, NOW);
    expect(g.saved[0]).toEqual({ "hub.texts": { quran: ["1"], japji: ["1"] } });
  });
});
