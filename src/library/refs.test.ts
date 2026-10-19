import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pageKey, pageOfRef, pageReadRef, parsePageKey, refId, unitNumber } from "./refs";

type Pages = { division: number; subdivision: number | null; title: string | null; firstRef: string; lastRef: string; passageCount: number }[];
const raw = (slug: string): Pages => JSON.parse(readFileSync(`e2e/fixtures/library/scriptures_${slug}.json`, "utf8")).data.pages;
const pages = (slug: string) =>
  raw(slug).map((p) => ({ key: pageKey(p.division, p.subdivision), division: p.division, subdivision: p.subdivision, title: p.title, firstRef: p.firstRef, lastRef: p.lastRef, count: p.passageCount }));
const edda = [
  { key: "1", division: 1, subdivision: null, title: "Voluspo", firstRef: "Voluspo 1", lastRef: "Voluspo 66", count: 66 },
  { key: "2", division: 2, subdivision: null, title: "Hovamol", firstRef: "Hovamol 1", lastRef: "Hovamol 165", count: 165 },
];

describe("the page of a reference", () => {
  it("finds the page by the range of a work with one level", () => {
    expect(pageOfRef(1, pages("dhammapada"), "Dhp 183")?.key).toBe("14");
    expect(pageOfRef(1, pages("dhammapada"), "Dhp 195-196")?.key).toBe("14");
    expect(pageOfRef(1, pages("dhammapada"), "Dhp 424")).toBeNull();
  });

  it("finds the page by the part of the reference before its last number", () => {
    expect(pageOfRef(3, pages("rig-veda"), "RV 10.129.1")?.key).toBe("10-129");
    expect(pageOfRef(3, pages("rig-veda"), "RV 10.48.6-7")?.key).toBe("10-48");
    expect(pageOfRef(2, edda, "Voluspo 3")?.key).toBe("1");
    expect(pageOfRef(2, edda, "Lokasenna 3")).toBeNull();
  });
});

describe("the reference that reads a whole page", () => {
  it("is the range of a work with one level, and the part before the last number otherwise", () => {
    expect(pageReadRef(1, { firstRef: "Dhp 179", lastRef: "Dhp 195-196" })).toBe("Dhp 179-196");
    expect(pageReadRef(1, { firstRef: "Japji 0", lastRef: "Japji 0" })).toBe("Japji 0");
    expect(pageReadRef(3, { firstRef: "RV 10.129.1", lastRef: "RV 10.129.7" })).toBe("RV 10.129");
    expect(pageReadRef(2, { firstRef: "Theogony 1-25", lastRef: "Theogony 1021-1022" })).toBe("Theogony");
    expect(pageReadRef(3, { firstRef: "1 Nephi 1:1", lastRef: "1 Nephi 1:20" })).toBe("1 Nephi 1");
    expect(pageReadRef(2, { firstRef: "Helgakvitha Hundingsbana II 1", lastRef: "Helgakvitha Hundingsbana II 51" })).toBe("Helgakvitha Hundingsbana II");
  });
});

describe("keys, ids, and numbers", () => {
  it("writes and reads a page key", () => {
    expect(pageKey(14, null)).toBe("14");
    expect(pageKey(10, 129)).toBe("10-129");
    expect(parsePageKey("10-129")).toEqual({ division: 10, subdivision: 129 });
    expect(parsePageKey("14")).toEqual({ division: 14, subdivision: null });
    expect(parsePageKey("x")).toBeNull();
    expect(parsePageKey("1-2-3")).toBeNull();
  });

  it("gives an id for an address and the number beside a passage", () => {
    expect(refId("Dhp 21")).toBe("Dhp_21");
    expect(refId("RV 10.129.1")).toBe("RV_10.129.1");
    expect(refId("1 Nephi 3:7")).toBe("1_Nephi_3:7");
    expect(unitNumber("RV 10.129.1")).toBe("10.129.1");
    expect(unitNumber("1 Nephi 3:7")).toBe("3:7");
    expect(unitNumber("Skáldskaparmál 60.1")).toBe("60.1");
    expect(unitNumber("Theogony 1-25")).toBe("1-25");
  });
});
