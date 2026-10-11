import { describe, expect, it } from "vitest";
import { PAPERS, PARTS } from "@/content/paper-index";
import { percent, summarize } from "./progress-summary";

const all = PAPERS.reduce((n, paper) => n + paper.paragraphs, 0);
const of = (id: string) => PAPERS[Number(id)].paragraphs;

describe("a share as a whole percent", () => {
  it("is 0 for nothing and 100 only for all", () => {
    expect(percent(0, 200)).toBe(0);
    expect(percent(200, 200)).toBe(100);
    expect(percent(199, 200)).toBe(99);
    expect(percent(1, 5000)).toBe(1);
    expect(percent(50, 200)).toBe(25);
  });
});

describe("the summary of what a reader read", () => {
  it("is all zero for a reader who read nothing", () => {
    const s = summarize({}, null);
    expect(s).toMatchObject({ read: 0, total: all, percent: 0, finished: 0, started: 0, untouched: 197, next: [] });
    expect(s.parts.map((part) => part.percent)).toEqual([0, 0, 0, 0, 0]);
  });

  it("counts the paragraphs, and sorts each paper as finished, started, or not started", () => {
    const s = summarize({ "0": of("0"), "1": Math.ceil(of("1") * 0.9), "2": 10 }, null);
    expect(s.read).toBe(of("0") + Math.ceil(of("1") * 0.9) + 10);
    expect(s).toMatchObject({ finished: 2, started: 1, untouched: 194 });
    expect(s.parts[0]).toMatchObject({ name: "Foreword", title: null, percent: 100 });
    expect(s.parts[1]).toMatchObject({ name: "Part I", title: PARTS[1].title });
  });

  it("lists the papers to continue: the paper of the place first, then the most read", () => {
    const s = summarize({ "2": 10, "3": 30, "5": 20, "1": of("1") }, "5");
    expect(s.next.map((paper) => paper.id)).toEqual(["5", "3", "2"]);
    expect(s.next[0]).toMatchObject({ title: PAPERS[5].title, percent: percent(20, of("5")) });
  });

  it("lists five papers at most, and no paper that is finished", () => {
    const counts = Object.fromEntries(["1", "2", "3", "4", "5", "6", "7"].map((id) => [id, 5]));
    expect(summarize(counts, null).next).toHaveLength(5);
    expect(summarize({ "1": of("1") }, "1").next).toEqual([]);
  });

  it("ignores a paper that does not exist, and a count above the paper", () => {
    const s = summarize({ "999": 40, x: 3, "1": 100_000 }, null);
    expect(s.read).toBe(of("1"));
    expect(s.finished).toBe(1);
  });
});
