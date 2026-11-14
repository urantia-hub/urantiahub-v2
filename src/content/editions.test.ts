import { describe, expect, it } from "vitest";
import { changesByRef, changesOfPaper } from "./editions";

const row = (o: Record<string, unknown>) => ({ ref: "61:0.2", year: 2015, kind: "text", before: "a", after: "b", applied: true, reason: "Why.", ...o });

describe("changesByRef", () => {
  it("groups the text changes by paragraph, in order", () => {
    const out = changesByRef({ data: [row({}), row({ before: "c", after: "d", reason: null }), row({ ref: "61:1.1", year: null })] });
    expect(out).toEqual({
      "61:0.2": [
        { year: 2015, before: "a", after: "b", reason: "Why." },
        { year: 2015, before: "c", after: "d", reason: null },
      ],
      "61:1.1": [{ year: null, before: "a", after: "b", reason: "Why." }],
    });
  });

  it("leaves out a change of italics, a fault of the printing, and a change that the text does not have", () => {
    const out = changesByRef({ data: [row({ kind: "format" }), row({ kind: "printing" }), row({ applied: false })] });
    expect(out).toEqual({});
  });

  it("gives one paper its own part of the list, and no part of a paper whose number starts the same", () => {
    const all = changesByRef({ data: [row({}), row({ ref: "161:0.2" }), row({ ref: "6:1.1" })] });
    expect(Object.keys(changesOfPaper(all, "61"))).toEqual(["61:0.2"]);
    expect(changesOfPaper(all, "1")).toEqual({});
  });

  it("refuses an answer of an unknown shape", () => {
    expect(() => changesByRef({ data: [{ ref: 1 }] })).toThrow(/unknown shape/);
  });
});
