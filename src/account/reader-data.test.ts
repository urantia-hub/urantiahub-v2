import { describe, expect, it } from "vitest";
import { newer, parsePlace, parseSettings, PLACE_KEY, SETTINGS_KEY } from "./reader-data";

describe("a place", () => {
  it("is a paper that exists, a section, and a time", () => {
    expect(parsePlace({ paperId: "2", sectionId: "3", at: 1000 })).toEqual({ paperId: "2", sectionId: "3", at: 1000, label: null });
  });

  it("is nothing for a paper that does not exist, or a value of another form", () => {
    for (const bad of [null, "x", {}, { paperId: "900", sectionId: "1", at: 1 }, { paperId: "2", sectionId: "x", at: 1 }, { paperId: 2, sectionId: "1", at: 1 }, { paperId: "2", sectionId: "1" }, { paperId: "2", sectionId: "1", at: -5 }, { paperId: "2", sectionId: "1", at: Number.NaN }]) {
      expect(parsePlace(bad)).toBeNull();
    }
  });

  // A clock that is wrong must not hold "Continue" for good: a time far in the future counts as now.
  it("does not keep a time from the future", () => {
    const now = 1_000_000;
    expect(parsePlace({ paperId: "2", sectionId: "3", at: now + 86_400_000 * 30 }, now)?.at).toBe(now);
    expect(parsePlace({ paperId: "2", sectionId: "3", at: now + 1000 }, now)?.at).toBe(now + 1000);
  });

  it("keeps a short label as text, and drops what it does not know", () => {
    expect(parsePlace({ paperId: "2", sectionId: "3", at: 5, label: "3. Justice", extra: 1 })).toEqual({ paperId: "2", sectionId: "3", at: 5, label: "3. Justice" });
    expect(parsePlace({ paperId: "2", sectionId: "3", at: 5, label: "x".repeat(121) })?.label).toBeNull();
    expect(parsePlace({ paperId: "2", sectionId: "3", at: 5, label: { a: 1 } })?.label).toBeNull();
  });
});

describe("reader settings", () => {
  it("are a theme, a text size, and a time", () => {
    expect(parseSettings({ theme: "dark", textSize: 4, at: 9 })).toEqual({ theme: "dark", textSize: 4, at: 9 });
  });

  it("are nothing for a value outside the choices", () => {
    for (const bad of [null, {}, { theme: "blue", textSize: 2, at: 1 }, { theme: "dark", textSize: 5, at: 1 }, { theme: "dark", textSize: 1.5, at: 1 }, { theme: "dark", textSize: "2", at: 1 }, { theme: "dark", textSize: 2 }]) {
      expect(parseSettings(bad)).toBeNull();
    }
  });
});

// Monday on the phone, Tuesday on the laptop: Tuesday wins on both.
describe("which of two values wins", () => {
  const monday = { paperId: "5", sectionId: "1", at: 100, label: null };
  const tuesday = { paperId: "9", sectionId: "2", at: 200, label: null };
  it("is the newer one, from either side", () => {
    expect(newer(monday, tuesday)).toEqual({ value: tuesday, from: "account" });
    expect(newer(tuesday, monday)).toEqual({ value: tuesday, from: "browser" });
  });
  it("is the one that exists", () => {
    expect(newer(null, tuesday)).toEqual({ value: tuesday, from: "account" });
    expect(newer(monday, null)).toEqual({ value: monday, from: "browser" });
    expect(newer(null, null)).toEqual({ value: null, from: "none" });
  });
  it("is the browser's for the same time, so nothing is sent or changed", () => {
    expect(newer(monday, { ...tuesday, at: 100 }).from).toBe("same");
  });
});

describe("the names in the reader's preferences", () => {
  it("start with hub., because the record is shared by all apps", () => {
    expect(PLACE_KEY).toBe("hub.place");
    expect(SETTINGS_KEY).toBe("hub.reader");
  });
});
