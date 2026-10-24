import { describe, expect, it } from "vitest";
import liveSlugs from "@/lib/live-paper-slugs.json";
import { PAPERS, PAPERS_BY_LANG, PARTS, paperById, paperPath, referenceHref } from "./paper-index";

describe("paper index", () => {
  it("holds 197 papers, and the array index equals the paper number", () => {
    expect(PAPERS).toHaveLength(197);
    PAPERS.forEach((paper, n) => expect(paper.id).toBe(String(n)));
  });

  it("produces exactly the 197 paper slugs of the live Hub", () => {
    expect(PAPERS.map((p) => p.slug).sort()).toEqual([...liveSlugs].sort());
  });

  it("groups the papers into the Foreword part and four parts", () => {
    expect(PARTS.map((p) => p.id)).toEqual(["0", "1", "2", "3", "4"]);
    expect(PARTS[1].papers[0].id).toBe("1");
    expect(PARTS[4].papers.at(-1)?.id).toBe("196");
    expect(PARTS[1].sponsorship).toMatch(/^Sponsored by/);
  });

  it("looks a paper up by id", () => {
    expect(paperById("1")?.title).toBe("The Universal Father");
    expect(paperById("197")).toBeUndefined();
    expect(paperById("x")).toBeUndefined();
  });

  it("builds paths", () => {
    expect(paperPath("0")).toBe("/papers/foreword");
    expect(paperPath("1")).toBe("/papers/paper-1-the-universal-father");
    expect(referenceHref({ paperId: "1" })).toBe("/papers/paper-1-the-universal-father");
    expect(referenceHref({ paperId: "1", sectionId: "2" })).toBe("/papers/paper-1-the-universal-father#1:2");
    expect(referenceHref({ paperId: "1", sectionId: "0", paragraphId: "1" })).toBe(
      "/papers/paper-1-the-universal-father#1:0.1",
    );
  });
});

describe("the Spanish paper index", () => {
  it("holds each paper of the English index, with a Spanish slug", () => {
    expect(PAPERS_BY_LANG.es).toHaveLength(197);
    expect(PAPERS_BY_LANG.es.map((p) => p.id)).toEqual(PAPERS.map((p) => p.id));
    expect(paperById("1", "es")?.slug).toBe("documento-1-el-padre-universal");
    expect(paperById("0", "es")?.title).toBe("Prólogo");
    expect(paperById("1")?.slug).toBe("paper-1-the-universal-father");
  });
});
