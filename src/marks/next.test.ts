import { describe, expect, it } from "vitest";
import { BOOK } from "@/content/section-index";
import { nextMarks, timeWords } from "./next";

const all = (paperId: string) => BOOK.filter((entry) => entry.paperId === paperId).map((entry) => ({ paperId, sectionId: entry.id, how: "read" as const }));

describe("the nearest marks", () => {
  it("gives a new reader the first section and the short tools first", () => {
    const list = nextMarks({ rows: [], current: 0, earned: {}, nextMinutes: 1 });
    expect(list.map((item) => item.id)).toEqual(["first-section", "first-listen", "search"]);
    expect(list[0]).toEqual({ id: "first-section", line: "Finish one section · about 1 min", progress: null });
  });

  it("leaves out what the reader holds, and names the shortest paper when one is left", () => {
    const tools = { "first-section": "t", "first-listen": "t", search: "t", parallels: "t", terms: "t", note: "t", image: "t", share: "t" };
    const list = nextMarks({ rows: all("1").slice(0, 2), current: 1, earned: tools, nextMinutes: 3 });
    expect(list[0].id).toBe("papers-1");
    expect(list[0].line).toMatch(/^The Origins of Worship · \d+ sections? left · about \d+ (min|hour|hours)$/);
    expect(list.some((item) => item.id in tools)).toBe(false);
  });

  it("counts the days left of a streak mark, with its progress", () => {
    const earned = Object.fromEntries(["first-section", "first-listen", "search", "parallels", "terms", "note", "image", "share", "papers-1", "foreword", "papers-5"].map((id) => [id, "t"]));
    const rows = ["1", "2", "3", "4", "5"].flatMap(all);
    const streak = nextMarks({ rows, current: 5, earned, nextMinutes: 3 }).find((item) => item.id === "streak-7");
    expect(streak).toEqual({ id: "streak-7", line: "2 days left", progress: 5 / 7 });
  });

  it("counts papers by the shortest ones left", () => {
    const earned = { "papers-1": "t" };
    const rows = all("1");
    const five = nextMarks({ rows, current: 0, earned, nextMinutes: 3 }, 40).find((item) => item.id === "papers-5");
    expect(five?.line).toMatch(/^4 papers left · about \d+ (min|hour|hours)$/);
    expect(five?.progress).toBeCloseTo(1 / 5);
  });

  it("writes a time in plain words", () => {
    expect(timeWords(0.4)).toBe("about 1 min");
    expect(timeWords(41)).toBe("about 41 min");
    expect(timeWords(75)).toBe("about 1 hour");
    expect(timeWords(130)).toBe("about 2 hours");
  });
});
