import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { LibraryWork, WorkPage, WorkPassage } from "@/content/library";
import { biblePages, type BibleBook } from "@/library/bible";
import { pageOfRef } from "@/library/refs";
import { passageForLink, passageFromLink, passageText } from "./passage";

const FIXTURES = join(process.cwd(), "e2e/fixtures/library");
const read = (name: string) => JSON.parse(readFileSync(join(FIXTURES, name), "utf8")).data;

// A work and its pages as the recorded API answers give them.
function work(slug: string): { work: LibraryWork; pages: WorkPage[] } {
  if (slug === "bible") {
    return { work: { slug, refPrefix: "", refLevels: 2 } as LibraryWork, pages: biblePages(read("bible_books.json") as BibleBook[]) };
  }
  const raw = read(`scriptures_${slug}.json`);
  const pages = (raw.pages as { division: number; subdivision: number | null; title: string | null; firstRef: string; lastRef: string; passageCount: number }[]).map((p) => ({
    key: p.subdivision === null ? String(p.division) : `${p.division}-${p.subdivision}`,
    division: p.division,
    subdivision: p.subdivision,
    title: p.title,
    firstRef: p.firstRef,
    lastRef: p.lastRef,
    count: p.passageCount,
  }));
  return { work: { slug, refPrefix: raw.refPrefix, refLevels: raw.refLevels } as LibraryWork, pages };
}

const roundTrip = (slug: string, ref: string) => {
  const { work: w, pages } = work(slug);
  const part = passageForLink(ref, w);
  return [part, passageFromLink(part, w, pages)];
};

describe("the passage of a work in a link", () => {
  it("writes the numbers only for a work with one prefix, with dots", () => {
    expect(roundTrip("rig-veda", "RV 10.10.3")).toEqual(["10.10.3", "RV 10.10.3"]);
    expect(roundTrip("bhagavad-gita", "BG 7.22-24")).toEqual(["7.22-24", "BG 7.22-24"]);
    expect(roundTrip("quran", "Quran 2.255-257")).toEqual(["2.255-257", "Quran 2.255-257"]);
    expect(roundTrip("dhammapada", "Dhp 26")).toEqual(["26", "Dhp 26"]);
  });

  it("writes the name for a work with names, and gives back the name and the colon of the work", () => {
    expect(roundTrip("book-of-mormon", "1 Nephi 3:7")).toEqual(["1-nephi.3.7", "1 Nephi 3:7"]);
    expect(roundTrip("prose-edda", "Gylfaginning 9.1")).toEqual(["gylfaginning.9.1", "Gylfaginning 9.1"]);
    expect(roundTrip("bible", "John 3:16")).toEqual(["john.3.16", "John 3:16"]);
    expect(roundTrip("bible", "Daniel (Greek) 3:5")).toEqual(["daniel-greek.3.5", "Daniel (Greek) 3:5"]);
    expect(roundTrip("hesiod", "Theogony 116-138")).toEqual(["theogony.116-138", "Theogony 116-138"]);
  });

  it("keeps a name with a letter outside ASCII", () => {
    const [part, back] = roundTrip("prose-edda", "Skáldskaparmál 8.1");
    expect(part).toMatch(/^[a-z0-9-]+\.8\.1$/);
    expect(back).toBe("Skáldskaparmál 8.1");
  });

  it("refuses a form that it does not write", () => {
    const rv = work("rig-veda");
    for (const bad of ["10.10.3x", "RV-10.10.3", "rv.10.10.3", "", "10..3", "10.10.3-", "10:10.3"]) expect(passageFromLink(bad, rv.work, rv.pages)).toBeNull();
    const bom = work("book-of-mormon");
    for (const bad of ["1-Nephi.3.7", "3-nephi-x.3.7", "nephi.3.7", "1-nephi", "1-nephi.3:7"]) expect(passageFromLink(bad, bom.work, bom.pages)).toBeNull();
  });
});

describe("the link form from the prefix of the work alone", () => {
  it("is the form of the page list for the first and the last passage of each recorded page", () => {
    const slugs = readdirSync(FIXTURES).flatMap((n) => (n.startsWith("scriptures_") ? [n.slice(11, -5)] : []));
    for (const slug of [...slugs, "bible"]) {
      const { work: w, pages } = work(slug);
      for (const p of pages)
        for (const ref of [p.firstRef, p.lastRef]) {
          const part = passageForLink(ref, w);
          expect(passageFromLink(part, w, pages), `${slug} ${ref}`).toBe(ref);
        }
    }
  });
});

describe("the text of a passage in a link", () => {
  const passages = (refs: string[]): WorkPassage[] => refs.map((ref) => ({ ref, number: ref.split(" ").pop() ?? "", text: `text of ${ref}`, url: null }));
  const dhp = passages(["Dhp 21", "Dhp 22", "Dhp 23", "Dhp 24", "Dhp 25", "Dhp 26-27"]);
  const bg = passages(["BG 7.21", "BG 7.22", "BG 7.23", "BG 7.24", "BG 7.25"]);

  it("is the passage itself", () => {
    expect(passageText("Dhp 22", dhp)).toEqual({ ref: "Dhp 22", text: "text of Dhp 22", ids: ["Dhp_22"] });
  });

  it("joins the passages of a range with a space", () => {
    expect(passageText("BG 7.22-24", bg)).toEqual({ ref: "BG 7.22-24", text: "text of BG 7.22 text of BG 7.23 text of BG 7.24", ids: ["BG_7.22", "BG_7.23", "BG_7.24"] });
  });

  it("is the joined passage that holds a number", () => {
    expect(passageText("Dhp 26", dhp)).toEqual({ ref: "Dhp 26-27", text: "text of Dhp 26-27", ids: ["Dhp_26-27"] });
  });

  it("is nothing for a passage that the page does not have", () => {
    expect(passageText("Dhp 99", dhp)).toBeNull();
    expect(passageText("BG 8.22", bg)).toBeNull();
  });
});

describe("a reference to a whole chapter", () => {
  // The parallels name a chapter of the Tao Te Ching ("TTC 1"); World texts names its lines ("TTC 1.1").
  const passages: WorkPassage[] = JSON.parse(readFileSync("e2e/fixtures/library/works_tao-te-ching_TTC-1.json", "utf8")).data.map((p: { reference: string; text: string }) => ({ ref: p.reference, number: "", text: p.text, url: null }));
  it("is a link that goes back to the chapter", () => {
    const { work: w, pages } = work("tao-te-ching");
    expect(passageFromLink(passageForLink("TTC 1", w), w, pages)).toBe("TTC 1");
  });
  it("is on the page of the chapter", () => {
    const { work: w, pages } = work("tao-te-ching");
    expect(pageOfRef(w.refLevels, pages, "TTC 1")?.firstRef).toBe("TTC 1.1");
  });
  it("has the text of each passage of the chapter", () => {
    const found = passageText("TTC 1", passages);
    expect(found?.ref).toBe("TTC 1");
    expect(found?.ids).toHaveLength(passages.length);
    expect(found?.text).toBe(passages.map((p) => p.text).join(" "));
  });
});
