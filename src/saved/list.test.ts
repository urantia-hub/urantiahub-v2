import { describe, expect, it } from "vitest";
import type { SavedEntry } from "@/account/saved-data";
import { groupByPaper, latest, pick, sortEntries } from "./list";

const note = (id: string, ref: string, text: string, at: string) => ({ id, ref, text, at });
const entry = (ref: string, over: Partial<SavedEntry> = {}): SavedEntry => ({ ref, paperId: ref.split(":")[0], paperTitle: `Paper ${ref.split(":")[0]} title`, text: `Text of ${ref}.`, savedAt: null, notes: [], ...over });

const A = entry("1:0.3", { savedAt: "2026-10-01T00:00:00.000Z", paperTitle: "The Universal Father", text: "The enlightened worlds all recognize the Universal Father.", notes: [note("n1", "1:0.3", "Compare with Paper 10.", "2026-10-06T00:00:00.000Z")] });
const B = entry("2:3.1", { savedAt: "2026-10-04T00:00:00.000Z", paperTitle: "The Nature of God" });
const C = entry("1:10.2", { notes: [note("n2", "1:10.2", "Ask the group about UPHOLDER.", "2026-10-02T00:00:00.000Z")], paperTitle: "The Universal Father" });
const D = entry("0:1.4", { savedAt: "2026-09-01T00:00:00.000Z", paperTitle: "Foreword" });
const ALL = [A, B, C, D];
const refs = (entries: SavedEntry[]) => entries.map((e) => e.ref);

describe("the filter", () => {
  it("All keeps each entry", () => expect(refs(pick(ALL, "all", ""))).toEqual(refs(ALL)));
  it("Paragraphs keeps the saved paragraphs", () => expect(refs(pick(ALL, "paragraphs", ""))).toEqual(["1:0.3", "2:3.1", "0:1.4"]));
  it("Notes keeps the paragraphs with a note", () => expect(refs(pick(ALL, "notes", ""))).toEqual(["1:0.3", "1:10.2"]));
});

describe("the search", () => {
  it.each([
    ["a word of a note, in any case", "upholder", ["1:10.2"]],
    ["a word of the paragraph", "enlightened", ["1:0.3"]],
    ["a reference", "2:3.1", ["2:3.1"]],
    ["the title of a paper", "nature of god", ["2:3.1"]],
    ["each word, in any order and place", "father compare", ["1:0.3"]],
    ["nothing for a word that is nowhere", "zebra", []],
    ["all for spaces only", "   ", ["1:0.3", "2:3.1", "1:10.2", "0:1.4"]],
  ])("finds %s", (_name, query, found) => {
    expect(refs(pick(ALL, "all", query))).toEqual(found);
  });

  it("works with the filter", () => expect(refs(pick(ALL, "notes", "father"))).toEqual(["1:0.3", "1:10.2"]));
  it("treats signs of a pattern as plain text", () => expect(pick(ALL, "all", ".*")).toEqual([]));
});

describe("the sort", () => {
  it("has the time of the last thing that the reader did with a paragraph", () => {
    expect(latest(A)).toBe("2026-10-06T00:00:00.000Z");
    expect(latest(B)).toBe("2026-10-04T00:00:00.000Z");
  });
  it("Newest first follows that time", () => expect(refs(sortEntries(ALL, "newest"))).toEqual(["1:0.3", "2:3.1", "1:10.2", "0:1.4"]));
  it("By paper follows the text, with numbers as numbers", () => expect(refs(sortEntries([C, B, A, D], "paper"))).toEqual(["0:1.4", "1:0.3", "1:10.2", "2:3.1"]));
  it("does not change the list that it got", () => {
    const given = [C, B, A, D];
    sortEntries(given, "paper");
    expect(refs(given)).toEqual(["1:10.2", "2:3.1", "1:0.3", "0:1.4"]);
  });
});

describe("the groups of By paper", () => {
  it("are one for each paper, in the order of the text", () => {
    expect(groupByPaper(sortEntries(ALL, "paper")).map((g) => [g.paperId, g.title, refs(g.entries)])).toEqual([
      ["0", "Foreword", ["0:1.4"]],
      ["1", "Paper 1 · The Universal Father", ["1:0.3", "1:10.2"]],
      ["2", "Paper 2 · The Nature of God", ["2:3.1"]],
    ]);
  });
});
