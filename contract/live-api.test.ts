// Runs each night against the live API. It fails when the API no longer matches what the gateway expects.
import { UrantiaAPI } from "@urantia/api";
import { describe, expect, it } from "vitest";
import { excerptPassage, fetchExact, fetchPaper, fetchPassage, fetchRelated, TocResponseSchema, type ContentClient, type SearchClient } from "@/content/fetchers";
import { PARTS } from "@/content/paper-index";
import { GLOSSARY } from "@/glossary/glossary";
import { HOME_PASSAGES } from "@/content/passages";

const api = new UrantiaAPI();
const client: ContentClient = {
  papers: { get: (id) => api.papers.get(id) },
  paragraphs: { get: (ref) => api.paragraphs.get(ref) },
};

describe("live API contract", () => {
  it("serves a paper in the shape that the gateway validates", async () => {
    const paper = await fetchPaper(client, "1");
    expect(paper.title).toBe("The Universal Father");
    expect(paper.sections[0].id).toBe("0");
    expect(paper.sections[0].paragraphs[0].ref).toBe("1:0.1");
  });

  it("gives each paragraph of Paper 1 a nova audio file on the CDN", async () => {
    const paper = await fetchPaper(client, "1");
    const paragraphs = paper.sections.flatMap((s) => s.paragraphs);
    expect(paragraphs.length).toBeGreaterThan(50);
    for (const p of paragraphs) {
      expect(p.audio?.url, p.ref).toMatch(/^https:\/\/cdn\.urantia\.dev\/audio\/eng\/paragraphs\/nova\//);
      expect(p.audio?.duration, p.ref).toBeGreaterThan(0);
    }
  });

  it("serves the Foreword and the last paper", async () => {
    expect((await fetchPaper(client, "0")).title).toBe("Foreword");
    expect((await fetchPaper(client, "196")).title).toBe("The Faith of Jesus");
  });

  it("still holds each home passage word for word", async () => {
    for (const entry of HOME_PASSAGES) {
      const passage = excerptPassage(await fetchPassage(client, entry.ref), entry);
      expect(passage.text.length).toBeGreaterThan(40);
    }
  });

  it("has the same table of contents as the committed paper index", async () => {
    const toc = TocResponseSchema.parse(await api.toc.get());
    const live = toc.data.parts.map((part) => ({
      id: part.id,
      title: part.title,
      sponsorship: part.sponsorship,
      papers: part.papers.map((p) => ({ id: p.id, title: p.title })),
    }));
    const committed = PARTS.map((part) => ({
      id: part.id,
      title: part.title,
      sponsorship: part.sponsorship,
      papers: part.papers.map((p) => ({ id: p.id, title: p.title })),
    }));
    expect(live).toEqual(committed);
  });

  it("marks the matched words of a full-text search, and gives a total", async () => {
    const search: SearchClient = { search: { fullText: (p) => api.search.fullText(p), semantic: (p) => api.search.semantic(p) } };
    const page = await fetchExact(search, "thought adjuster", 0, 5);
    expect(page.total).toBeGreaterThan(100);
    expect(page.hits).toHaveLength(5);
    expect(page.hits[0].html).toContain("urantia-dev-highlighted");
  });

  it("gives paragraphs for a question from the semantic search", async () => {
    const search: SearchClient = { search: { fullText: (p) => api.search.fullText(p), semantic: (p) => api.search.semantic(p) } };
    const page = await fetchRelated(search, "what happens after death", 5);
    expect(page.hits).toHaveLength(5);
    expect(page.hits[0].ref).toMatch(/^\d+:\d+\.\d+$/);
  });

  // When this fails, run `bun run sync:glossary` and commit the file.
  it("has the same count of glossary entries as the committed file", async () => {
    const res = await fetch("https://api.urantia.dev/entities?limit=1");
    const body = (await res.json()) as { data: { id: string; name: string; type: string }[]; meta: { total: number } };
    expect(body.meta.total).toBe(GLOSSARY.length);
    expect(Object.keys(body.data[0])).toEqual(expect.arrayContaining(["id", "name", "type", "aliases", "description", "seeAlso", "citationCount"]));
  });
});
