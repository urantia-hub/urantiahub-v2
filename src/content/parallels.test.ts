import { describe, expect, it, vi } from "vitest";
import { ContentError, ParagraphNotFound } from "./fetchers";
import { fetchParallels } from "./parallels";

const answer = (over: object = {}) => ({
  data: {
    standardReferenceId: "1:0.3",
    bibleParallels: [{ reference: "Tobit 13:4", text: "Declare his greatness.", similarity: 0.42, url: "https://ebible.org/eng-web/TOB13.htm#V4", bookCode: "Tob" }],
    urantiaParallels: [{ standardReferenceId: "56:9.10", paperId: "56", paperTitle: "Universal Unity", text: "And God the Father.", similarity: 0.73 }],
    scriptureParallels: [{ reference: "BG 7.22-24", text: "He endowed.", similarity: 0.46, url: null, corpus: { id: "bhagavad-gita-besant-1922", refPrefix: "BG", title: "The Bhagavad Gita", translator: "Annie Besant", year: 1922, religion: "Hinduism" } }],
    ...over,
  },
});
const client = (raw: unknown) => ({ paragraphs: { get: vi.fn(async () => raw) } });

describe("fetchParallels", () => {
  it("asks for the three kinds in one request, and keeps the fields that the Hub uses", async () => {
    const c = client(answer());
    expect(await fetchParallels(c, "1:0.3")).toEqual({
      bible: [{ reference: "Tobit 13:4", text: "Declare his greatness.", similarity: 0.42, url: "https://ebible.org/eng-web/TOB13.htm#V4" }],
      papers: [{ reference: "56:9.10", paperId: "56", paperTitle: "Universal Unity", text: "And God the Father.", similarity: 0.73 }],
      scripture: [{ reference: "BG 7.22-24", text: "He endowed.", similarity: 0.46, url: null, corpus: { id: "bhagavad-gita-besant-1922", refPrefix: "BG", title: "The Bhagavad Gita", translator: "Annie Besant", year: 1922 } }],
    });
    expect(c.paragraphs.get).toHaveBeenCalledWith("1:0.3", { include: "bibleParallels,urantiaParallels,scriptureParallels" });
  });

  it("takes a paragraph with no parallel of a kind, and an answer from before the address existed", async () => {
    const raw = answer({ scriptureParallels: undefined, bibleParallels: [{ reference: "John 1:1", text: "In the beginning.", similarity: 0.5 }] });
    const found = await fetchParallels(client(raw), "1:0.3");
    expect(found.scripture).toEqual([]);
    expect(found.bible[0].url).toBeNull();
  });

  it("says that the paper has no such paragraph when the API answers 404", async () => {
    const c = { paragraphs: { get: vi.fn(async () => Promise.reject(new Error("404: Not Found"))) } };
    await expect(fetchParallels(c, "1:0.99")).rejects.toBeInstanceOf(ParagraphNotFound);
  });

  it("throws the one error of the gateway for a failed request, an unknown shape, or another paragraph", async () => {
    await expect(fetchParallels({ paragraphs: { get: vi.fn(async () => Promise.reject(new Error("500: down"))) } }, "1:0.3")).rejects.toBeInstanceOf(ContentError);
    await expect(fetchParallels(client({ data: { standardReferenceId: "1:0.3", bibleParallels: "x" } }), "1:0.3")).rejects.toBeInstanceOf(ContentError);
    await expect(fetchParallels(client(answer({ standardReferenceId: "2:0.1" })), "1:0.3")).rejects.toBeInstanceOf(ContentError);
  });
});
