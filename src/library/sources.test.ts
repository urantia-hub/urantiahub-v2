import { describe, expect, it } from "vitest";
import { sourceSite } from "./sources";

describe("the name of the site of a source", () => {
  it("names each of the three sites", () => {
    expect(sourceSite("https://www.gutenberg.org/ebooks/2017")).toBe("Project Gutenberg");
    expect(sourceSite("https://en.wikisource.org/wiki/The_Hymns_of_the_Rigveda")).toBe("Wikisource");
    expect(sourceSite("https://ebible.org/find/details.php?id=eng-web")).toBe("eBible.org");
  });

  it("names no other site, and no address that does not read", () => {
    expect(sourceSite("https://example.com/gutenberg.org")).toBeNull();
    expect(sourceSite("not an address")).toBeNull();
    expect(sourceSite(null)).toBeNull();
  });
});
