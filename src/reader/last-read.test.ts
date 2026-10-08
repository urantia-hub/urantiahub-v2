import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LAST_READ_KEY, readLastRead, saveLastRead } from "./last-read";

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("the last place the reader was", () => {
  it("is nothing for a new visitor", () => {
    expect(readLastRead()).toBeNull();
  });

  it("holds the paper and the section", () => {
    saveLastRead({ paperId: "26", sectionId: "4", label: "4. The Secondary Supernaphim" });
    expect(readLastRead()).toEqual({ paperId: "26", sectionId: "4", label: "4. The Secondary Supernaphim" });
  });

  it("gives the same object for the same stored value, so React does not render in a loop", () => {
    saveLastRead({ paperId: "1", sectionId: "0", label: null });
    expect(readLastRead()).toBe(readLastRead());
  });

  it.each([
    ["text that is not JSON", "{oops"],
    ["a paper that does not exist", JSON.stringify({ paperId: "999", sectionId: "1", label: null })],
    ["a section that is not a number", JSON.stringify({ paperId: "1", sectionId: "<b>", label: null })],
    ["a label that is not text", JSON.stringify({ paperId: "1", sectionId: "1", label: { a: 1 } })],
    ["a label that is too long", JSON.stringify({ paperId: "1", sectionId: "1", label: "x".repeat(200) })],
    ["a value that is not an object", "7"],
  ])("is nothing for %s", (_name, raw) => {
    window.localStorage.setItem(LAST_READ_KEY, raw);
    expect(readLastRead()).toBeNull();
  });

  it("does not throw when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => saveLastRead({ paperId: "1", sectionId: "0", label: null })).not.toThrow();
    expect(readLastRead()).toBeNull();
  });
});
