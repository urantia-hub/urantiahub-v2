// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PARTS } from "@/content/paper-index";
import { BOOK } from "@/content/section-index";
import { earnedMarks, finishedPapers, mergeMarks } from "./earn";
import { MARKS, TIERS } from "./list";

const words = new Map<string, number>();
for (const entry of BOOK) words.set(entry.paperId, (words.get(entry.paperId) ?? 0) + entry.words);
const average = [...words.values()].reduce((a, b) => a + b, 0) / 197;
const time = (minutes: number) => (minutes < 90 ? "about 1 hour" : `about ${Math.round(minutes / 60)} hours`);
const rowsOf = (paperIds: string[], how: "read" | "heard" = "read") => BOOK.filter((entry) => paperIds.includes(entry.paperId)).map((entry) => ({ paperId: entry.paperId, sectionId: entry.id, how }));

describe("the list of marks", () => {
  it("has 30 marks in four tiers, each id once", () => {
    expect(MARKS).toHaveLength(30);
    expect(new Set(MARKS.map((mark) => mark.id)).size).toBe(30);
    expect(TIERS.map((tier) => MARKS.filter((mark) => mark.tier === tier.tier).length)).toEqual([8, 5, 15, 2]);
  });

  it("gives each paper and part mark its time at 100 words a minute", () => {
    for (const mark of MARKS) {
      if (mark.rule.kind === "papers" && mark.id !== "book") expect(mark.effort, mark.id).toBe(time((mark.rule.count * average) / 100));
      if (mark.rule.kind === "part") {
        const rule = mark.rule;
        const part = PARTS.find((p) => p.id === rule.partId);
        expect(mark.effort, mark.id).toBe(time(part!.papers.reduce((sum, paper) => sum + (words.get(paper.id) ?? 0), 0) / 100));
      }
    }
    expect(MARKS.find((mark) => mark.id === "book")?.effort).toBe(`all 197 papers · ${time((197 * average) / 100)}`);
  });
});

describe("the earned marks", () => {
  it("counts a paper only with each of its sections", () => {
    const most = rowsOf(["1"]).slice(1);
    expect(finishedPapers(most).has("1")).toBe(false);
    expect(finishedPapers(rowsOf(["1"])).has("1")).toBe(true);
  });

  it("earns the paper marks at their counts, and no earlier", () => {
    const nineteen = rowsOf(Array.from({ length: 19 }, (_, i) => String(i + 1)));
    expect(earnedMarks(nineteen, 0)).toContain("papers-10");
    expect(earnedMarks(nineteen, 0)).not.toContain("papers-20");
    expect(earnedMarks(rowsOf(Array.from({ length: 20 }, (_, i) => String(i + 1))), 0)).toContain("papers-20");
  });

  it("earns a part with each of its papers, and the Foreword on its own", () => {
    const partOne = rowsOf(Array.from({ length: 31 }, (_, i) => String(i + 1)));
    expect(earnedMarks(partOne, 0)).toContain("part-1");
    expect(earnedMarks(partOne.slice(1), 0)).not.toContain("part-1");
    expect(earnedMarks(rowsOf(["0"]), 0)).toEqual(expect.arrayContaining(["foreword", "papers-1", "first-section"]));
  });

  it("earns the first listen and the streak marks", () => {
    expect(earnedMarks(rowsOf(["2"], "heard").slice(0, 1), 7)).toEqual(["first-section", "first-listen", "streak-7"]);
    expect(earnedMarks([], 30)).toEqual(["streak-7", "streak-30"]);
  });

  it("keeps the first time of a mark, and names the new ones", () => {
    expect(mergeMarks({ search: "a" }, ["search", "first-section"], "b")).toEqual({ marks: { search: "a", "first-section": "b" }, fresh: ["first-section"] });
  });
});
