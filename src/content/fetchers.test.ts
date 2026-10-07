import { describe, expect, it } from "vitest";
import { ContentError, fetchPaper, fetchPassage, type ContentClient } from "./fetchers";

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
