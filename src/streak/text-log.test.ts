import { beforeEach, describe, expect, it } from "vitest";
import { clearTextLog, noteTextRead, TEXT_LOG_KEY, textPageSent } from "./text-log";

const ALL = Array.from({ length: 10 }, (_, i) => `p${i}`);

beforeEach(() => window.localStorage.clear());

describe("the log of the world-text pages", () => {
  it("adds up the passages of more than one visit to a page", () => {
    expect(noteTextRead("r1", "quran", "2", ALL.slice(0, 5), ALL)).toBe(false);
    expect(noteTextRead("r1", "quran", "2", ALL.slice(5, 9), ALL)).toBe(true);
  });

  it("does not count a page again after the account took it", () => {
    noteTextRead("r1", "quran", "2", ALL, ALL);
    textPageSent("r1", "quran", "2");
    expect(noteTextRead("r1", "quran", "2", ALL, ALL)).toBe(false);
  });

  it("keeps nothing of another reader", () => {
    noteTextRead("r1", "quran", "2", ALL.slice(0, 8), ALL);
    expect(noteTextRead("r2", "quran", "2", ALL.slice(8), ALL)).toBe(false);
  });

  it("needs each passage of a page of one or two", () => {
    expect(noteTextRead("r1", "japji", "1", ["a"], ["a", "b"])).toBe(false);
    expect(noteTextRead("r1", "japji", "1", ["b"], ["a", "b"])).toBe(true);
  });

  it("is gone after a clear", () => {
    noteTextRead("r1", "quran", "2", ["p1"], ALL);
    clearTextLog();
    expect(window.localStorage.getItem(TEXT_LOG_KEY)).toBeNull();
  });
});
