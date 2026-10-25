import { describe, expect, it } from "vitest";
import { BOOK } from "@/content/section-index";
import { TEXT_WORKS, textWork } from "@/content/text-index";
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

  it("offers no world-text mark before the reader starts a world text", () => {
    const list = nextMarks({ rows: [], current: 0, earned: {}, nextMinutes: 1 }, 40);
    expect(list.some((mark) => mark.id === "first-text" || mark.id.startsWith("texts-"))).toBe(false);
  });

  it("names the world text when one is left, with its pages left and its progress", () => {
    const dhammapada = textWork("dhammapada")!;
    const keys = dhammapada.pages.slice(0, -4).map((page) => page.key);
    const whole = nextMarks({ rows: [], current: 0, earned: {}, nextMinutes: 1, texts: { dhammapada: keys } }, 40).find((mark) => mark.id === "texts-1");
    expect(whole?.line).toMatch(/^The Dhammapada · 4 of 26 chapters left · about \d+ min$/);
    expect(whole?.progress).toBeCloseTo(22 / 26);
  });

  it("counts world texts by the shortest ones left", () => {
    const shortest = [...TEXT_WORKS].sort((a, b) => a.words - b.words)[0];
    const texts = { [shortest.slug]: shortest.pages.map((page) => page.key) };
    const five = nextMarks({ rows: [], current: 0, earned: { "texts-1": "t" }, nextMinutes: 1, texts }, 40).find((mark) => mark.id === "texts-5");
    expect(five?.line).toMatch(/^4 works left · about \d+ (min|hour|hours)$/);
    expect(five?.progress).toBeCloseTo(1 / 5);
  });

  it("writes a time in plain words", () => {
    expect(timeWords(0.4)).toBe("about 1 min");
    expect(timeWords(41)).toBe("about 41 min");
    expect(timeWords(75)).toBe("about 1 hour");
    expect(timeWords(130)).toBe("about 2 hours");
  });

  it("speaks Spanish on a Spanish page, with the same marks", () => {
    const es = nextMarks({ rows: [], current: 0, earned: {}, nextMinutes: 1 }, 3, "es");
    expect(es.map((item) => item.id)).toEqual(["first-section", "first-listen", "search"]);
    expect(es[0].line).toBe("Termina una sección · 1 min");
    expect(es[2].line).toBe("Busca cualquier palabra · 1 min");
    const earned = Object.fromEntries(["first-section", "first-listen", "search", "parallels", "terms", "note", "image", "share", "papers-1", "foreword", "papers-5"].map((id) => [id, "t"]));
    const rows = ["1", "2", "3", "4", "5"].flatMap(all);
    expect(nextMarks({ rows, current: 5, earned, nextMinutes: 3 }, 40, "es").find((item) => item.id === "streak-7")?.line).toBe("Quedan 2 días");
    const one = nextMarks({ rows: all("1").slice(0, 2), current: 1, earned: { "first-section": "t", "first-listen": "t", search: "t", parallels: "t", terms: "t", note: "t", image: "t", share: "t" }, nextMinutes: 3 }, 3, "es");
    expect(one[0].line).toMatch(/^Los orígenes de la adoración · quedan? \d+ secci(ón|ones) · (unos \d+ min|cerca de 1 hora|unas \d+ horas)$/);
  });

  it("says a time in Spanish", () => {
    expect(timeWords(45, "es")).toBe("unos 45 min");
    expect(timeWords(75, "es")).toBe("cerca de 1 hora");
    expect(timeWords(240, "es")).toBe("unas 4 horas");
  });
});
