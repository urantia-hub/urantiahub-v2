import { beforeEach, describe, expect, it, vi } from "vitest";
import { readLangChoice, readingLang, setReadingLang, subscribeToReadingLang } from "./reading-lang";

describe("the reading language", () => {
  beforeEach(() => window.localStorage.clear());
  it("is null until the reader chooses", () => {
    expect(readingLang()).toBeNull();
  });
  it("keeps the choice in hub:lang", () => {
    setReadingLang("es");
    expect(window.localStorage.getItem("hub:lang")).toBe("es");
    expect(readingLang()).toBe("es");
  });
  it("reads no other value", () => {
    window.localStorage.setItem("hub:lang", "fr");
    expect(readingLang()).toBeNull();
  });
});

describe("the language choice with its time", () => {
  beforeEach(() => window.localStorage.clear());
  it("keeps the time of the choice in hub:lang-at", () => {
    setReadingLang("es", 20);
    expect(window.localStorage.getItem("hub:lang-at")).toBe("20");
    expect(readLangChoice()).toEqual({ lang: "es", at: 20 });
  });
  it("has the time 0 for a choice from before the time was kept", () => {
    window.localStorage.setItem("hub:lang", "en");
    expect(readLangChoice()).toEqual({ lang: "en", at: 0 });
  });
  it("is null with no choice", () => {
    expect(readLangChoice()).toBeNull();
  });
  it("tells each listener of a new choice, until it stops listening", () => {
    const listener = vi.fn();
    const stop = subscribeToReadingLang(listener);
    setReadingLang("es");
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
    setReadingLang("en");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
