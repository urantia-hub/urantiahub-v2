import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { whenIdle } from "./when-idle";

function setReadyState(state: DocumentReadyState) {
  Object.defineProperty(document, "readyState", { value: state, configurable: true });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  setReadyState("complete");
});

describe("whenIdle", () => {
  it("waits for the page load before it does anything", () => {
    setReadyState("loading");
    const work = vi.fn();
    whenIdle(work);
    vi.advanceTimersByTime(10_000);
    expect(work).not.toHaveBeenCalled();
    window.dispatchEvent(new Event("load"));
    vi.advanceTimersByTime(10_000);
    expect(work).toHaveBeenCalledTimes(1);
  });

  // Safari has no requestIdleCallback. A 1 ms timer would put the work back on the path to the first paint.
  it("waits two seconds after the load in a browser with no requestIdleCallback", () => {
    setReadyState("complete");
    vi.stubGlobal("requestIdleCallback", undefined);
    const work = vi.fn();
    whenIdle(work);
    vi.advanceTimersByTime(1_900);
    expect(work).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(work).toHaveBeenCalledTimes(1);
  });

  it("uses requestIdleCallback when the browser has it", () => {
    setReadyState("complete");
    const idle = vi.fn((callback: () => void) => {
      callback();
      return 1;
    });
    vi.stubGlobal("requestIdleCallback", idle);
    const work = vi.fn();
    whenIdle(work);
    expect(idle).toHaveBeenCalledTimes(1);
    expect(work).toHaveBeenCalledTimes(1);
  });
});
