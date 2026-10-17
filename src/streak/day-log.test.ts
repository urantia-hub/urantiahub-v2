import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearDayLog, DAY_LOG_KEY, finished, noteHeard, noteRead } from "./day-log";
import { createHearing } from "./heard";

const refs = (paper: string, section: string, n: number) => Array.from({ length: n }, (_, i) => `${paper}:${section}.${i + 1}`);
const ten = { id: "4", refs: refs("3", "4", 10) };
const two = { id: "5", refs: refs("3", "5", 2) };

beforeEach(() => window.localStorage.clear());

describe("the day log", () => {
  it("finishes a section at nine of ten paragraphs, one time a day", () => {
    noteRead("r1", "2026-10-16", ten.refs.slice(0, 8));
    expect(finished("r1", "2026-10-16", [ten])).toEqual([]);
    noteRead("r1", "2026-10-16", ten.refs.slice(8, 9));
    expect(finished("r1", "2026-10-16", [ten])).toEqual([{ sectionId: "4", how: "read" }]);
    noteRead("r1", "2026-10-16", ten.refs.slice(9));
    expect(finished("r1", "2026-10-16", [ten])).toEqual([]);
  });

  it("needs each paragraph of a short section", () => {
    noteRead("r1", "2026-10-16", two.refs.slice(0, 1));
    expect(finished("r1", "2026-10-16", [two])).toEqual([]);
    noteHeard("r1", "2026-10-16", two.refs.slice(1));
    expect(finished("r1", "2026-10-16", [two])).toEqual([{ sectionId: "5", how: "read" }]);
  });

  it("calls a section heard when most of it was heard", () => {
    noteHeard("r1", "2026-10-16", ten.refs.slice(0, 6));
    noteRead("r1", "2026-10-16", ten.refs.slice(6));
    expect(finished("r1", "2026-10-16", [ten])).toEqual([{ sectionId: "4", how: "heard" }]);
  });

  it("starts again for another day or another reader", () => {
    noteRead("r1", "2026-10-16", ten.refs.slice(0, 5));
    noteRead("r1", "2026-10-17", ten.refs.slice(5));
    expect(finished("r1", "2026-10-17", [ten])).toEqual([]);
    noteRead("r2", "2026-10-17", ten.refs);
    expect(finished("r1", "2026-10-17", [ten])).toEqual([]);
    expect(finished("r2", "2026-10-17", [ten])).toEqual([{ sectionId: "4", how: "read" }]);
  });

  it("forgets all of it on a sign-out", () => {
    noteRead("r1", "2026-10-16", ten.refs);
    clearDayLog();
    expect(window.localStorage.getItem(DAY_LOG_KEY)).toBeNull();
    expect(finished("r1", "2026-10-16", [ten])).toEqual([]);
  });

  it("does nothing, with no error, when storage is blocked", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => noteRead("r1", "2026-10-16", ten.refs)).not.toThrow();
    expect(finished("r1", "2026-10-16", [ten])).toEqual([]);
    spy.mockRestore();
  });
});

describe("createHearing", () => {
  const hearing = () => createHearing((ref) => (ref.startsWith("3:4.") ? 20 : 0));

  it("answers a paragraph that was played to near its end", () => {
    const ear = hearing();
    expect(ear.observe("3:4.1", 2)).toBeNull();
    expect(ear.observe("3:4.1", 17)).toBeNull();
    expect(ear.observe("3:4.2", 0)).toBe("3:4.1");
  });

  it("answers nothing for a paragraph that the reader skipped", () => {
    const ear = hearing();
    ear.observe("3:4.1", 6);
    expect(ear.observe("3:4.2", 0)).toBeNull();
    expect(ear.observe(null, 0)).toBeNull();
  });

  it("answers the last paragraph when the voice stops after its end", () => {
    const ear = hearing();
    ear.observe("3:4.3", 19);
    expect(ear.observe(null, 0)).toBe("3:4.3");
  });

  it("ignores an item that is not a paragraph", () => {
    const ear = hearing();
    expect(ear.observe("section:4", 3)).toBeNull();
    expect(ear.observe("3:4.1", 1)).toBeNull();
  });
});
