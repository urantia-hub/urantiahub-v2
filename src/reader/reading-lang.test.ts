import { beforeEach, describe, expect, it } from "vitest";
import { readingLang, setReadingLang } from "./reading-lang";

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
