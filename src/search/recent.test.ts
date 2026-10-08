import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearRecent, readRecent, RECENT_KEY, saveRecent } from "./recent";

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("recent searches", () => {
  it("is empty for a new visitor", () => {
    expect(readRecent()).toEqual([]);
  });
  it("puts the newest first and keeps five", () => {
    for (const q of ["a", "b", "c", "d", "e", "f"]) saveRecent(q);
    expect(readRecent()).toEqual(["f", "e", "d", "c", "b"]);
  });
  it("moves a repeated search to the front, with no regard to case", () => {
    saveRecent("Adjuster");
    saveRecent("soul");
    saveRecent("adjuster");
    expect(readRecent()).toEqual(["adjuster", "soul"]);
  });
  it("gives the same list object for the same stored value", () => {
    saveRecent("a");
    expect(readRecent()).toBe(readRecent());
  });
  it("clears", () => {
    saveRecent("a");
    clearRecent();
    expect(readRecent()).toEqual([]);
  });
  it.each([
    ["text that is not JSON", "{oops"],
    ["a value that is not a list", '{"a":1}'],
  ])("is empty for %s", (_name, raw) => {
    window.localStorage.setItem(RECENT_KEY, raw);
    expect(readRecent()).toEqual([]);
  });
  it("drops entries that are not short text", () => {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(["ok", 7, "x".repeat(500), null, "fine"]));
    expect(readRecent()).toEqual(["ok", "fine"]);
  });
  it("does not throw when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => saveRecent("a")).not.toThrow();
    expect(readRecent()).toEqual([]);
  });
});
