import { z } from "zod";
import { sanitizeParagraphHtml } from "@/lib/sanitize";
import { hasWord } from "@/search/query";

// The one error type that the gateway throws.
export class ContentError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ContentError";
  }
}

const ParagraphSchema = z.object({
  standardReferenceId: z.string(),
  paperId: z.string(),
  sectionId: z.string(),
  paragraphId: z.string(),
  paperTitle: z.string(),
  sectionTitle: z.string().nullable(),
  text: z.string().min(1),
  htmlText: z.string().min(1),
  audio: z.unknown().optional(),
});

const PaperResponseSchema = z.object({
  data: z.object({
    paper: z.object({ id: z.string(), title: z.string(), partId: z.string() }),
    paragraphs: z.array(ParagraphSchema).min(1),
  }),
});

const ParagraphResponseSchema = z.object({ data: ParagraphSchema });

export const TocResponseSchema = z.object({
  data: z.object({
    parts: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        sponsorship: z.string().nullable(),
        papers: z.array(z.object({ id: z.string(), title: z.string() })),
      }),
    ),
  }),
});

// The one voice that covers every paragraph. Its URL comes from the API. The gateway never builds one.
const NovaAudioSchema = z.object({
  "tts-1-hd": z.object({
    nova: z.object({ url: z.string().startsWith("https://cdn.urantia.dev/"), duration: z.number().positive() }),
  }),
});

export type ParagraphAudio = { url: string; duration: number };

export function novaAudio(raw: unknown): ParagraphAudio | null {
  const parsed = NovaAudioSchema.safeParse(raw);
  if (!parsed.success) return null;
  const { url, duration } = parsed.data["tts-1-hd"].nova;
  return { url, duration };
}

export type Paragraph = { ref: string; text: string; html: string; audio: ParagraphAudio | null };
export type Section = { id: string; title: string | null; paragraphs: Paragraph[] };
export type PaperDoc = { id: string; title: string; partId: string; sections: Section[] };
export type Passage = { ref: string; paperId: string; paperTitle: string; text: string };

// The part of the SDK client that the gateway uses. Results are unknown until validated.
export type ContentClient = {
  papers: { get(id: string): Promise<unknown> };
  paragraphs: { get(ref: string): Promise<unknown> };
};

export async function fetchPaper(client: ContentClient, id: string): Promise<PaperDoc> {
  let raw: unknown;
  try {
    raw = await client.papers.get(id);
  } catch (cause) {
    throw new ContentError(`Paper ${id}: the content API request failed`, cause);
  }
  const parsed = PaperResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ContentError(`Paper ${id}: the content API response has an unknown shape`, parsed.error);
  }

  const { paper, paragraphs } = parsed.data.data;
  if (paper.id !== id) throw new ContentError(`Paper ${id}: the content API returned paper ${paper.id}`);
  const sections: Section[] = [];
  for (const p of paragraphs) {
    let section = sections.at(-1);
    if (!section || section.id !== p.sectionId) {
      section = { id: p.sectionId, title: p.sectionTitle, paragraphs: [] };
      sections.push(section);
    }
    section.paragraphs.push({
      ref: p.standardReferenceId,
      text: p.text,
      html: sanitizeParagraphHtml(p.htmlText),
      audio: novaAudio(p.audio),
    });
  }
  return { id: paper.id, title: paper.title, partId: paper.partId, sections };
}

const SENTENCE_END = /[.?!][”"’']?$/;
const AFTER_SENTENCE = /[.?!][”"’']?\s+$/;
// What follows a clause in the source: a semicolon, or a space and a dash.
const CLAUSE_BREAK = /^(?:;|\s[—–])/;

export type Excerpt = { text?: string; clause?: boolean };

// A home passage can be part of a paragraph: one or more whole sentences, exact and in order.
// This is the check that stops a misquote. It throws when the excerpt is not in the paragraph
// word for word, or when it starts or ends in the middle of a sentence.
// `clause` is for a paragraph that is one long sentence: the excerpt can then end where the
// source has a dash or a semicolon. The page shows the words only and adds no punctuation.
export function excerptPassage(passage: Passage, { text, clause = false }: Excerpt): Passage {
  if (text === undefined) return passage;
  const full = passage.text;
  if (text.length === 0) throw new ContentError(`Passage ${passage.ref}: the excerpt is empty`);

  let found = false;
  for (let at = full.indexOf(text); at !== -1; at = full.indexOf(text, at + 1)) {
    found = true;
    const end = at + text.length;
    const rest = full.slice(end);
    const startsSentence = at === 0 || AFTER_SENTENCE.test(full.slice(0, at));
    const endsSentence = SENTENCE_END.test(text) && (rest === "" || /^\s/.test(rest));
    const endsClause = clause && CLAUSE_BREAK.test(rest);
    if (startsSentence && (endsSentence || endsClause)) return { ...passage, text };
  }
  throw new ContentError(
    found
      ? `Passage ${passage.ref}: the excerpt must be whole sentences of the paragraph`
      : `Passage ${passage.ref}: the excerpt is not in the paragraph word for word`,
  );
}

export async function fetchPassage(client: ContentClient, ref: string): Promise<Passage> {
  let raw: unknown;
  try {
    raw = await client.paragraphs.get(ref);
  } catch (cause) {
    throw new ContentError(`Passage ${ref}: the content API request failed`, cause);
  }
  const parsed = ParagraphResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ContentError(`Passage ${ref}: the content API response has an unknown shape`, parsed.error);
  }
  const p = parsed.data.data;
  if (p.standardReferenceId !== ref) {
    throw new ContentError(`Passage ${ref}: the content API returned ${p.standardReferenceId}`);
  }
  return { ref, paperId: p.paperId, paperTitle: p.paperTitle, text: p.text };
}

const SearchResponseSchema = z.object({
  data: z.array(
    z.object({
      standardReferenceId: z.string().min(1),
      paperId: z.string(),
      paperTitle: z.string(),
      htmlText: z.string().min(1),
    }),
  ),
  meta: z.object({ total: z.number().int().nonnegative() }),
});

// `html` is the paragraph as the API gives it, with matched words marked. It is input for the snippet builder.
// It never reaches the page as HTML.
export type SearchHit = { ref: string; paperId: string; paperTitle: string; html: string };
export type SearchPage = { hits: SearchHit[]; total: number };

export type SearchClient = {
  search: {
    fullText(params: { q: string; type: "and"; page: number; limit: number }): Promise<unknown>;
    semantic(params: { q: string; limit: number }): Promise<unknown>;
  };
};

function toSearchPage(raw: unknown, what: string): SearchPage {
  const parsed = SearchResponseSchema.safeParse(raw);
  if (!parsed.success) throw new ContentError(`${what}: the content API response has an unknown shape`, parsed.error);
  return {
    hits: parsed.data.data.map((row) => ({ ref: row.standardReferenceId, paperId: row.paperId, paperTitle: row.paperTitle, html: row.htmlText })),
    total: parsed.data.meta.total,
  };
}

// Paragraphs that hold all of the words.
export async function fetchExact(client: SearchClient, q: string, page: number, limit: number): Promise<SearchPage> {
  // The API answers 400 for a text with no letter and no number. That is "no result", not a failure.
  if (!hasWord(q)) return { hits: [], total: 0 };
  let raw: unknown;
  try {
    raw = await client.search.fullText({ q, type: "and", page, limit });
  } catch (cause) {
    throw new ContentError("Exact search: the content API request failed", cause);
  }
  return toSearchPage(raw, "Exact search");
}

// Paragraphs that are near the text in meaning.
export async function fetchRelated(client: SearchClient, q: string, limit: number): Promise<SearchPage> {
  if (!hasWord(q)) return { hits: [], total: 0 };
  let raw: unknown;
  try {
    raw = await client.search.semantic({ q, limit });
  } catch (cause) {
    throw new ContentError("Related search: the content API request failed", cause);
  }
  return toSearchPage(raw, "Related search");
}
