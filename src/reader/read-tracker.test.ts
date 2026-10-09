import { describe, expect, it } from "vitest";
import { dwellMs, ReadTracker } from "./read-tracker";

describe("how long a paragraph must be in view to count as read", () => {
  it("fits its length, between one second and eight", () => {
    expect(dwellMs(20)).toBe(1000);
    expect(dwellMs(300)).toBe(3600);
    expect(dwellMs(5000)).toBe(8000);
  });
});

describe("the read tracker", () => {
  function tracker() {
    let now = 0;
    const t = new ReadTracker(() => now);
    return { t, pass: (ms: number) => (now += ms) };
  }

  it("counts a paragraph after its time in view, one time only", () => {
    const { t, pass } = tracker();
    t.enter("1:0.1", 300);
    pass(3000);
    expect(t.collect()).toEqual([]);
    pass(700);
    expect(t.collect()).toEqual(["1:0.1"]);
    pass(5000);
    expect(t.collect()).toEqual([]);
    t.leave("1:0.1");
    t.enter("1:0.1", 300);
    pass(9000);
    expect(t.collect()).toEqual([]);
  });

  it("does not count a paragraph that a fast scroll passed", () => {
    const { t, pass } = tracker();
    t.enter("1:0.1", 300);
    pass(400);
    t.leave("1:0.1");
    pass(60_000);
    expect(t.collect()).toEqual([]);
  });

  it("adds the time of two visits", () => {
    const { t, pass } = tracker();
    t.enter("1:0.1", 300);
    pass(2000);
    t.leave("1:0.1");
    pass(10_000);
    t.enter("1:0.1", 300);
    pass(1700);
    expect(t.collect()).toEqual(["1:0.1"]);
  });

  // A tab in the background, or a screen that is off, is not reading.
  it("does not count time while the page is hidden", () => {
    const { t, pass } = tracker();
    t.enter("1:0.1", 300);
    pass(1000);
    t.pause();
    pass(60_000);
    expect(t.collect()).toEqual([]);
    t.resume();
    pass(2600);
    expect(t.collect()).toEqual(["1:0.1"]);
  });

  it("counts each paragraph in view by itself", () => {
    const { t, pass } = tracker();
    t.enter("1:0.1", 100);
    t.enter("1:0.2", 600);
    pass(1300);
    expect(t.collect()).toEqual(["1:0.1"]);
    pass(6000);
    expect(t.collect()).toEqual(["1:0.2"]);
  });
});
