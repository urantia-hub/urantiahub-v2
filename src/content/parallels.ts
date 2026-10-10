import { z } from "zod";
import { ContentError, ParagraphNotFound } from "./fetchers";

// The passages that the API holds as near in meaning to one paragraph: of the Bible, of other works,
// and of the Papers. The API gives each outside passage the address of its page (`url`).
const number = z.number().finite();
const ResponseSchema = z.object({
  data: z.object({
    standardReferenceId: z.string(),
    bibleParallels: z.array(z.object({ reference: z.string().min(1), text: z.string().min(1), similarity: number, url: z.string().nullish() })).optional(),
    scriptureParallels: z
      .array(
        z.object({
          reference: z.string().min(1),
          text: z.string().min(1),
          similarity: number,
          url: z.string().nullish(),
          corpus: z.object({ id: z.string(), refPrefix: z.string(), title: z.string(), translator: z.string(), year: z.number() }),
        }),
      )
      .optional(),
    urantiaParallels: z.array(z.object({ standardReferenceId: z.string().min(1), paperId: z.string(), paperTitle: z.string(), text: z.string().min(1), similarity: number })).optional(),
  }),
});

export type RawCorpus = { id: string; refPrefix: string; title: string; translator: string; year: number };
export type RawParallels = {
  bible: { reference: string; text: string; similarity: number; url: string | null }[];
  scripture: { reference: string; text: string; similarity: number; url: string | null; corpus: RawCorpus }[];
  papers: { reference: string; paperId: string; paperTitle: string; text: string; similarity: number }[];
};

export type ParallelsClient = { paragraphs: { get(ref: string, options: { include: string }): Promise<unknown> } };

const INCLUDE = "bibleParallels,urantiaParallels,scriptureParallels";

export async function fetchParallels(client: ParallelsClient, ref: string): Promise<RawParallels> {
  let raw: unknown;
  try {
    raw = await client.paragraphs.get(ref, { include: INCLUDE });
  } catch (cause) {
    // The package reports a failed request as an Error whose message starts with the status.
    if (cause instanceof Error && /^404\b/.test(cause.message)) throw new ParagraphNotFound(ref);
    throw new ContentError(`Parallels of ${ref}: the content API request failed`, cause);
  }
  const parsed = ResponseSchema.safeParse(raw);
  if (!parsed.success) throw new ContentError(`Parallels of ${ref}: the content API response has an unknown shape`, parsed.error);
  const data = parsed.data.data;
  if (data.standardReferenceId !== ref) throw new ContentError(`Parallels of ${ref}: the content API returned ${data.standardReferenceId}`);
  return {
    bible: (data.bibleParallels ?? []).map((b) => ({ reference: b.reference, text: b.text, similarity: b.similarity, url: b.url ?? null })),
    scripture: (data.scriptureParallels ?? []).map((s) => ({
      reference: s.reference,
      text: s.text,
      similarity: s.similarity,
      url: s.url ?? null,
      corpus: { id: s.corpus.id, refPrefix: s.corpus.refPrefix, title: s.corpus.title, translator: s.corpus.translator, year: s.corpus.year },
    })),
    papers: (data.urantiaParallels ?? []).map((u) => ({ reference: u.standardReferenceId, paperId: u.paperId, paperTitle: u.paperTitle, text: u.text, similarity: u.similarity })),
  };
}
