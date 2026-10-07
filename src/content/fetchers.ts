import { z } from "zod";
import { sanitizeParagraphHtml } from "@/lib/sanitize";

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

export type Paragraph = { ref: string; text: string; html: string };
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
    });
  }
  return { id: paper.id, title: paper.title, partId: paper.partId, sections };
}

const SENTENCE_END = /[.?!][”"’']?$/;
const AFTER_SENTENCE = /[.?!][”"’']?\s+$/;

// A home passage can be part of a paragraph: one or more whole sentences, exact and in order.
// This is the check that stops a misquote. It throws when the excerpt is not in the paragraph
// word for word, or when it starts or ends in the middle of a sentence.
export function excerptPassage(passage: Passage, text: string | undefined): Passage {
  if (text === undefined) return passage;
  const full = passage.text;
  if (text.length === 0) throw new ContentError(`Passage ${passage.ref}: the excerpt is empty`);

  let found = false;
  for (let at = full.indexOf(text); at !== -1; at = full.indexOf(text, at + 1)) {
    found = true;
    const end = at + text.length;
    const startsSentence = at === 0 || AFTER_SENTENCE.test(full.slice(0, at));
    const endsSentence = SENTENCE_END.test(text) && (end === full.length || /\s/.test(full[end]));
    if (startsSentence && endsSentence) return { ...passage, text };
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
