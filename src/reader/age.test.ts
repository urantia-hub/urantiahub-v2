import { describe, expect, it } from "vitest";
import { age } from "./age";

const NOW = Date.parse("2026-10-09T12:00:00.000Z");
const ago = (days: number) => new Date(NOW - days * 86_400_000).toISOString();

describe("the age of a note", () => {
  it.each([
    [0, "today"],
    [1, "yesterday"],
    [3, "3 days ago"],
    [7, "last week"],
    [20, "2 weeks ago"],
    [40, "last month"],
    [200, "6 months ago"],
    [400, "last year"],
  ])("%i days is %s", (days, said) => {
    expect(age(ago(days), NOW)).toBe(said);
  });

  it("is today for a time that the clock of this device has not reached", () => {
    expect(age(ago(-1), NOW)).toBe("today");
  });

  it("is empty for a value that is not a time", () => {
    expect(age("x", NOW)).toBe("");
  });
});
