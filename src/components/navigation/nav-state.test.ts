import { describe, expect, it } from "vitest";
import { hasOwnNumber, nextHidden, sectionLabel } from "./nav-state";

describe("nextHidden", () => {
  it("hides the bar on a scroll down, away from the top", () => {
    expect(nextHidden(200, 240, false)).toBe(true);
  });
  it("shows the bar on a scroll up", () => {
    expect(nextHidden(240, 200, true)).toBe(false);
  });
  it("keeps the bar near the top of the page", () => {
    expect(nextHidden(0, 60, false)).toBe(false);
  });
  it("ignores a movement of a few pixels", () => {
    expect(nextHidden(200, 203, false)).toBe(false);
    expect(nextHidden(200, 197, true)).toBe(true);
  });
});

describe("sectionLabel", () => {
  it("names the opening section", () => {
    expect(sectionLabel({ id: "0", title: null })).toBe("Introduction");
  });
  // The Foreword's titles carry Roman numbers in the source: "I. Deity and Divinity".
  it("adds no number to a title that has its own", () => {
    expect(sectionLabel({ id: "1", title: "I. Deity and Divinity" })).toBe("I. Deity and Divinity");
    expect(sectionLabel({ id: "12", title: "XII. The Trinities" })).toBe("XII. The Trinities");
    expect(hasOwnNumber("In the Beginning")).toBe(false);
    expect(hasOwnNumber("I Am")).toBe(false);
  });
  it("numbers the other sections", () => {
    expect(sectionLabel({ id: "2", title: "The Reality of God" })).toBe("2. The Reality of God");
  });
});
