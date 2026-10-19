import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readTextPlace, saveTextPlace, TEXT_PLACES_KEY, textPlaceScript } from "./text-places";

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  delete document.documentElement.dataset.textPlace;
});

describe("the place of the reader in each work", () => {
  it("keeps one place for each work, and the newest page of a work wins", () => {
    saveTextPlace("dhammapada", { key: "2", title: "On Earnestness", label: "Chapter 2" });
    saveTextPlace("quran", { key: "1", title: "The Opening", label: null });
    saveTextPlace("dhammapada", { key: "3", title: "Thought", label: "Chapter 3" });
    expect(readTextPlace("dhammapada")).toMatchObject({ key: "3", title: "Thought", label: "Chapter 3" });
    expect(readTextPlace("quran")).toMatchObject({ key: "1" });
    expect(readTextPlace("bible")).toBeNull();
  });

  it("gives the same value while the stored text is the same", () => {
    saveTextPlace("dhammapada", { key: "2", title: "On Earnestness", label: null });
    expect(readTextPlace("dhammapada")).toBe(readTextPlace("dhammapada"));
  });

  it("reads a broken or a strange value as nothing", () => {
    window.localStorage.setItem(TEXT_PLACES_KEY, "{not json");
    expect(readTextPlace("dhammapada")).toBeNull();
    window.localStorage.setItem(TEXT_PLACES_KEY, JSON.stringify({ dhammapada: { key: "../x", title: "T", label: null, at: 1 } }));
    expect(readTextPlace("dhammapada")).toBeNull();
    window.localStorage.setItem(TEXT_PLACES_KEY, JSON.stringify({ dhammapada: { key: "2", title: "x".repeat(200), label: null, at: 1 } }));
    expect(readTextPlace("dhammapada")).toBeNull();
  });

  it("keeps a place in a store that already holds a broken value", () => {
    window.localStorage.setItem(TEXT_PLACES_KEY, "[]");
    saveTextPlace("dhammapada", { key: "2", title: "On Earnestness", label: null });
    expect(readTextPlace("dhammapada")?.key).toBe("2");
  });
});

describe("textPlaceScript", () => {
  it("marks the page before its first paint when this work has a place", () => {
    new Function(textPlaceScript("dhammapada"))();
    expect(document.documentElement.dataset.textPlace).toBeUndefined();
    saveTextPlace("dhammapada", { key: "2", title: "On Earnestness", label: null });
    new Function(textPlaceScript("quran"))();
    expect(document.documentElement.dataset.textPlace).toBeUndefined();
    new Function(textPlaceScript("dhammapada"))();
    expect(document.documentElement.dataset.textPlace).toBe("");
  });
});
