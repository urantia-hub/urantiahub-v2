import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyTextSize, currentTextSize, DEFAULT_STEP, SCALES, TEXT_SIZE_INIT_SCRIPT, TEXT_SIZE_KEY } from "./text-size";

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.style.removeProperty("--reader-scale");
  delete document.documentElement.dataset.textSize;
});

describe("text size", () => {
  it("has five steps, and the middle one is the size of the design", () => {
    expect(SCALES).toHaveLength(5);
    expect(SCALES[DEFAULT_STEP]).toBe(1);
    expect([...SCALES]).toEqual([...SCALES].sort((a, b) => a - b));
  });

  it("is the middle step for a new visitor", () => {
    expect(currentTextSize()).toBe(DEFAULT_STEP);
  });

  it("changes the size now and remembers it", () => {
    applyTextSize(4);
    expect(document.documentElement.style.getPropertyValue("--reader-scale")).toBe(String(SCALES[4]));
    expect(currentTextSize()).toBe(4);
    expect(window.localStorage.getItem(TEXT_SIZE_KEY)).toBe("4");
  });

  it("stays inside the five steps", () => {
    applyTextSize(9);
    expect(currentTextSize()).toBe(4);
    applyTextSize(-3);
    expect(currentTextSize()).toBe(0);
  });

  it("still changes the size when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => applyTextSize(3)).not.toThrow();
    expect(currentTextSize()).toBe(3);
    vi.restoreAllMocks();
  });

  // The script runs before the first paint, so a reader who chose a large size never sees the text jump.
  it.each([
    ["4", String(SCALES[4]), "4"],
    ["0", String(SCALES[0]), "0"],
    ["2", "", undefined],
    ["9", "", undefined],
    ["big", "", undefined],
  ])("the start script reads the stored step %s", (stored, scale, step) => {
    window.localStorage.setItem(TEXT_SIZE_KEY, stored);
    new Function(TEXT_SIZE_INIT_SCRIPT)();
    expect(document.documentElement.style.getPropertyValue("--reader-scale")).toBe(scale);
    expect(document.documentElement.dataset.textSize).toBe(step);
  });
});
