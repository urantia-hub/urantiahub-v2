import { describe, expect, it } from "vitest";
import { ContentError, excerptPassage, fetchPaper, fetchPassage, type ContentClient, type Passage } from "./fetchers";

const paragraph = (ref: string, sectionId: string, sectionTitle: string | null, html = `<span class="urantia-dev-pb-0">Text ${ref}</span>`) => ({
  id: `x-${ref}`,
  standardReferenceId: ref,
  paperId: "1",
  sectionId,
  paragraphId: ref.split(".")[1],
  paperTitle: "The Universal Father",
  sectionTitle,
  text: `Text ${ref}`,
  htmlText: html,
  labels: [],
  audio: null,
});

const paperResponse = {
  data: {
    paper: { id: "1", partId: "1", title: "The Universal Father", sortId: "1.001.000.000", labels: [], video: null },
    paragraphs: [
      paragraph("1:0.1", "0", null),
      paragraph("1:0.2", "0", null),
      paragraph("1:1.1", "1", "The Father’s Name"),
      paragraph("1:2.1", "2", "The Reality of God", '<span class="urantia-dev-pb-0" onclick="x()">Safe <script>bad()</script></span>'),
    ],
  },
};

function client(over: Partial<{ paper: unknown; paragraph: unknown; fail: boolean }> = {}): ContentClient {
  return {
    papers: {
      get: async () => {
        if (over.fail) throw new Error("network down");
        return "paper" in over ? over.paper : paperResponse;
      },
    },
    paragraphs: {
      get: async () => {
        if (over.fail) throw new Error("network down");
        return "paragraph" in over ? over.paragraph : { data: paragraph("1:0.1", "0", null) };
      },
    },
  };
}

describe("fetchPaper", () => {
  it("groups the paragraphs into sections in order", async () => {
    const paper = await fetchPaper(client(), "1");
    expect(paper).toMatchObject({ id: "1", title: "The Universal Father", partId: "1" });
    expect(paper.sections.map((s) => [s.id, s.title, s.paragraphs.length])).toEqual([
      ["0", null, 2],
      ["1", "The Father’s Name", 1],
      ["2", "The Reality of God", 1],
    ]);
    expect(paper.sections[0].paragraphs[0]).toEqual({
      ref: "1:0.1",
      text: "Text 1:0.1",
      html: '<span class="urantia-dev-pb-0">Text 1:0.1</span>',
    });
  });

  it("passes the paragraph HTML through the allow-list", async () => {
    const paper = await fetchPaper(client(), "1");
    const html = paper.sections[2].paragraphs[0].html;
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("<script");
    expect(html).toContain("Safe");
  });

  it("turns a request failure into a ContentError", async () => {
    await expect(fetchPaper(client({ fail: true }), "1")).rejects.toBeInstanceOf(ContentError);
    await expect(fetchPaper(client({ fail: true }), "1")).rejects.toThrow(/Paper 1/);
  });

  it("turns an unknown response shape into a ContentError", async () => {
    // The shape that the SDK types promise, which the live API does not send.
    const merged = { data: { id: "1", title: "The Universal Father", partId: "1", paragraphs: [] } };
    await expect(fetchPaper(client({ paper: merged }), "1")).rejects.toBeInstanceOf(ContentError);
    await expect(fetchPaper(client({ paper: null }), "1")).rejects.toBeInstanceOf(ContentError);
  });

  it("rejects a paper with no paragraphs", async () => {
    const empty = { data: { paper: paperResponse.data.paper, paragraphs: [] } };
    await expect(fetchPaper(client({ paper: empty }), "1")).rejects.toBeInstanceOf(ContentError);
  });
});

describe("fetchPassage", () => {
  it("returns the exact text with its reference and paper", async () => {
    await expect(fetchPassage(client(), "1:0.1")).resolves.toEqual({
      ref: "1:0.1",
      paperId: "1",
      paperTitle: "The Universal Father",
      text: "Text 1:0.1",
    });
  });

  it("rejects a response for a different reference", async () => {
    await expect(fetchPassage(client(), "99:1.1")).rejects.toBeInstanceOf(ContentError);
  });

  it("turns a request failure into a ContentError", async () => {
    await expect(fetchPassage(client({ fail: true }), "1:0.1")).rejects.toBeInstanceOf(ContentError);
  });
});

describe("excerptPassage", () => {
  const paragraph: Passage = {
    ref: "9:9.9",
    paperId: "9",
    paperTitle: "A Paper",
    text: "First sentence here. Second one asks why? “A quoted third.” The fourth ends it.",
  };

  it("returns the whole paragraph when no excerpt is given", () => {
    expect(excerptPassage(paragraph, undefined)).toEqual(paragraph);
  });

  it.each([
    "First sentence here.",
    "Second one asks why?",
    "First sentence here. Second one asks why?",
    "“A quoted third.”",
    "The fourth ends it.",
    "“A quoted third.” The fourth ends it.",
  ])("accepts the whole sentences %s", (text) => {
    expect(excerptPassage(paragraph, text)).toEqual({ ...paragraph, text });
  });

  it("rejects words that are not in the paragraph", () => {
    expect(() => excerptPassage(paragraph, "First sentence there.")).toThrow(ContentError);
    expect(() => excerptPassage(paragraph, "First sentence here. The fourth ends it.")).toThrow(/9:9.9/);
  });

  it("rejects an excerpt that starts in the middle of a sentence", () => {
    expect(() => excerptPassage(paragraph, "sentence here.")).toThrow(/whole sentences/);
    expect(() => excerptPassage(paragraph, "one asks why?")).toThrow(/whole sentences/);
  });

  it("rejects an excerpt that ends in the middle of a sentence", () => {
    expect(() => excerptPassage(paragraph, "First sentence")).toThrow(/whole sentences/);
    expect(() => excerptPassage(paragraph, "First sentence here. Second one")).toThrow(/whole sentences/);
  });

  it("does not treat a semicolon or a dash as the end of a sentence", () => {
    const p = { ...paragraph, text: "One part; another part — and more. Then the end." };
    expect(() => excerptPassage(p, "One part;")).toThrow(/whole sentences/);
    expect(() => excerptPassage(p, "another part — and more.")).toThrow(/whole sentences/);
    expect(excerptPassage(p, "One part; another part — and more.").text).toBe("One part; another part — and more.");
  });

  it("rejects an empty excerpt", () => {
    expect(() => excerptPassage(paragraph, "")).toThrow(ContentError);
  });
});
