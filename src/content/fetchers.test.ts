import { describe, expect, it } from "vitest";
import { ContentError, excerptPassage, fetchExact, fetchPaper, fetchPassage, fetchRelated, novaAudio, type SearchClient, type ContentClient, type Passage } from "./fetchers";

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
      audio: null,
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
    expect(excerptPassage(paragraph, {})).toEqual(paragraph);
  });

  it.each([
    "First sentence here.",
    "Second one asks why?",
    "First sentence here. Second one asks why?",
    "“A quoted third.”",
    "The fourth ends it.",
    "“A quoted third.” The fourth ends it.",
  ])("accepts the whole sentences %s", (text) => {
    expect(excerptPassage(paragraph, { text: text })).toEqual({ ...paragraph, text });
  });

  it("rejects words that are not in the paragraph", () => {
    expect(() => excerptPassage(paragraph, { text: "First sentence there." })).toThrow(ContentError);
    expect(() => excerptPassage(paragraph, { text: "First sentence here. The fourth ends it." })).toThrow(/9:9.9/);
  });

  it("rejects an excerpt that starts in the middle of a sentence", () => {
    expect(() => excerptPassage(paragraph, { text: "sentence here." })).toThrow(/whole sentences/);
    expect(() => excerptPassage(paragraph, { text: "one asks why?" })).toThrow(/whole sentences/);
  });

  it("rejects an excerpt that ends in the middle of a sentence", () => {
    expect(() => excerptPassage(paragraph, { text: "First sentence" })).toThrow(/whole sentences/);
    expect(() => excerptPassage(paragraph, { text: "First sentence here. Second one" })).toThrow(/whole sentences/);
  });

  it("does not treat a semicolon or a dash as the end of a sentence", () => {
    const p = { ...paragraph, text: "One part; another part — and more. Then the end." };
    expect(() => excerptPassage(p, { text: "One part;" })).toThrow(/whole sentences/);
    expect(() => excerptPassage(p, { text: "another part — and more." })).toThrow(/whole sentences/);
    expect(excerptPassage(p, { text: "One part; another part — and more." }).text).toBe("One part; another part — and more.");
  });

  describe("a clause, for a paragraph that is one long sentence", () => {
    const p = { ...paragraph, text: "The thesis of it — one part, more of it; another part; the last part." };

    it("can end at a dash of the source, and the page adds no punctuation", () => {
      expect(excerptPassage(p, { text: "The thesis of it", clause: true }).text).toBe("The thesis of it");
    });

    it("can end at a semicolon of the source", () => {
      const text = "The thesis of it — one part, more of it";
      expect(excerptPassage(p, { text, clause: true }).text).toBe(text);
    });

    it("is rejected unless the list entry says that it is a clause", () => {
      expect(() => excerptPassage(p, { text: "The thesis of it" })).toThrow(/whole sentences/);
    });

    it("still cannot end in the middle of a clause, at a comma, or in the middle of a word", () => {
      expect(() => excerptPassage(p, { text: "The thesis", clause: true })).toThrow(/whole sentences/);
      expect(() => excerptPassage(p, { text: "The thesis of it — one part", clause: true })).toThrow(/whole sentences/);
      expect(() => excerptPassage(p, { text: "The thesis of i", clause: true })).toThrow(/whole sentences/);
    });

    it("still must start at the start of a sentence", () => {
      expect(() => excerptPassage(p, { text: "another part", clause: true })).toThrow(/whole sentences/);
    });

    it("still must be word for word", () => {
      expect(() => excerptPassage(p, { text: "The thesis of this", clause: true })).toThrow(/word for word/);
    });
  });

  it("rejects an empty excerpt", () => {
    expect(() => excerptPassage(paragraph, { text: "" })).toThrow(ContentError);
  });
});

describe("novaAudio", () => {
  const nova = { url: "https://cdn.urantia.dev/audio/eng/paragraphs/nova/tts-1-hd-nova-1:1.0.1.mp3", duration: 45.6, format: "mp3" };

  it("reads the nova entry", () => {
    expect(novaAudio({ "tts-1-hd": { nova, onyx: { url: "https://cdn.urantia.dev/x.mp3", duration: 1 } } })).toEqual({
      url: nova.url,
      duration: 45.6,
    });
  });

  it("never uses another voice", () => {
    expect(novaAudio({ "tts-1-hd": { onyx: nova } })).toBeNull();
    expect(novaAudio({ "gpt-4o-mini-tts": { cedar: nova } })).toBeNull();
  });

  it.each([
    ["no audio", null],
    ["a missing value", undefined],
    ["a URL on another host", { "tts-1-hd": { nova: { ...nova, url: "https://audio.urantia.dev/x.mp3" } } }],
    ["a URL with no host", { "tts-1-hd": { nova: { ...nova, url: "/audio/x.mp3" } } }],
    ["a duration of zero", { "tts-1-hd": { nova: { ...nova, duration: 0 } } }],
    ["a duration that is text", { "tts-1-hd": { nova: { ...nova, duration: "45" } } }],
  ])("gives null for %s", (_name, raw) => {
    expect(novaAudio(raw)).toBeNull();
  });
});

describe("fetchPaper and audio", () => {
  it("puts the nova audio on each paragraph, or null", async () => {
    const withAudio = {
      data: {
        paper: paperResponse.data.paper,
        paragraphs: [
          { ...paragraph("1:0.1", "0", null), audio: { "tts-1-hd": { nova: { url: "https://cdn.urantia.dev/a.mp3", duration: 12 } } } },
          paragraph("1:0.2", "0", null),
        ],
      },
    };
    const paper = await fetchPaper(client({ paper: withAudio }), "1");
    expect(paper.sections[0].paragraphs.map((p) => p.audio)).toEqual([{ url: "https://cdn.urantia.dev/a.mp3", duration: 12 }, null]);
  });
});

describe("fetchPaper and the paper id", () => {
  it("throws when the API returns a paper other than the one asked for", async () => {
    await expect(fetchPaper(client(), "2")).rejects.toThrow(/Paper 2: the content API returned paper 1/);
  });
});

describe("the two searches", () => {
  const row = (ref: string) => ({
    standardReferenceId: ref,
    paperId: ref.split(":")[0],
    paperTitle: "A Paper",
    htmlText: `<span>Text ${ref}</span>`,
    text: `Text ${ref}`,
    rank: 0.5,
  });
  const good = { data: [row("16:8.3"), row("108:5.5")], meta: { page: 0, limit: 8, total: 244, totalPages: 31 } };

  function searchClient(over: Partial<{ exact: unknown; related: unknown; fail: boolean }> = {}) {
    const calls: unknown[] = [];
    const client: SearchClient = {
      search: {
        fullText: async (params) => {
          calls.push(["exact", params]);
          if (over.fail) throw new Error("500");
          return "exact" in over ? over.exact : good;
        },
        semantic: async (params) => {
          calls.push(["related", params]);
          if (over.fail) throw new Error("500");
          return "related" in over ? over.related : good;
        },
      },
    };
    return { client, calls };
  }

  it("asks for all of the words, and gives the hits and the total", async () => {
    const { client, calls } = searchClient();
    await expect(fetchExact(client, "thought adjuster", 2, 20)).resolves.toEqual({
      hits: [
        { ref: "16:8.3", paperId: "16", paperTitle: "A Paper", html: "<span>Text 16:8.3</span>" },
        { ref: "108:5.5", paperId: "108", paperTitle: "A Paper", html: "<span>Text 108:5.5</span>" },
      ],
      total: 244,
    });
    expect(calls).toEqual([["exact", { q: "thought adjuster", type: "and", page: 2, limit: 20 }]]);
  });

  it("asks the semantic search with a limit", async () => {
    const { client, calls } = searchClient();
    const page = await fetchRelated(client, "what happens after death", 10);
    expect(page.hits).toHaveLength(2);
    expect(calls).toEqual([["related", { q: "what happens after death", limit: 10 }]]);
  });

  it("gives an empty page for no result", async () => {
    const { client } = searchClient({ exact: { data: [], meta: { total: 0 } } });
    await expect(fetchExact(client, "zzzz", 0, 8)).resolves.toEqual({ hits: [], total: 0 });
  });

  it.each([
    ["a failed request", { fail: true }],
    ["a response with no data", { exact: { meta: { total: 1 } }, related: { meta: { total: 1 } } }],
    ["a row with no reference", { exact: { data: [{ paperId: "1" }], meta: { total: 1 } }, related: { data: [{ paperId: "1" }], meta: { total: 1 } } }],
  ])("throws a ContentError for %s", async (_name, over) => {
    const { client } = searchClient(over);
    await expect(fetchExact(client, "a", 0, 8)).rejects.toBeInstanceOf(ContentError);
    await expect(fetchRelated(client, "a", 10)).rejects.toBeInstanceOf(ContentError);
  });
});

describe("a search text with no letter or number", () => {
  // The API answers 400 for such text. That is "no result", not a failure.
  it.each(["???", "…", "愛"])("gives an empty page for %s, with no request", async (q) => {
    const calls: unknown[] = [];
    const client: SearchClient = {
      search: {
        fullText: async (p) => (calls.push(p), { data: [], meta: { total: 0 } }),
        semantic: async (p) => (calls.push(p), { data: [], meta: { total: 0 } }),
      },
    };
    await expect(fetchExact(client, q, 0, 8)).resolves.toEqual({ hits: [], total: 0 });
    await expect(fetchRelated(client, q, 10)).resolves.toEqual({ hits: [], total: 0 });
    expect(calls).toEqual([]);
  });
});
