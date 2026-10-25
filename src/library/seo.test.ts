import { describe, expect, it } from "vitest";
import type { LibraryWork } from "@/content/library";
import { workHeadline } from "./seo";

const work = (title: string, byline: string) => ({ title, byline }) as LibraryWork;

describe("workHeadline", () => {
  it("names the work and its parts in Spanish, with no article", () => {
    expect(workHeadline(work("El Dhammapada", "F. Max Muller, 1881"), ["26 capítulos", "414 versículos"], "list", "es")).toBe("El Dhammapada (F. Max Muller, 1881): 26 capítulos");
  });

  it("names the work, its translator, and all its parts", () => {
    expect(workHeadline(work("The Dhammapada", "F. Max Muller, 1881"), ["26 chapters", "414 verses"], "list")).toBe("The Dhammapada (F. Max Muller, 1881): all 26 chapters");
  });

  it("does not name the translator twice when the title already does", () => {
    expect(workHeadline(work("The Bible (World English Bible)", "World English Bible"), ["81 books", "38,034 verses"], "books")).toBe("The Bible (World English Bible): all 81 books");
  });

  it("gives a work of one page no count of parts", () => {
    expect(workHeadline(work("Japji", "Bhai Vir Singh, 1920"), ["40 pauris"], "single")).toBe("Japji (Bhai Vir Singh, 1920)");
  });
});
