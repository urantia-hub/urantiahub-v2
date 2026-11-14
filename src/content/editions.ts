import { z } from "zod";
import { ContentError } from "./fetchers";
import type { TextChange } from "@/editions/changes";

// The changes to the 1955 text, from the list that Urantia Foundation adopted.
// Only a change of the words that the stored text has: the 1955 text reads differently there.
const RowSchema = z.object({
  ref: z.string().min(1),
  year: z.number().int().nullable(),
  kind: z.string(),
  before: z.string(),
  after: z.string(),
  applied: z.boolean(),
  reason: z.string().nullish(),
});
const ResponseSchema = z.object({ data: z.array(RowSchema) });

// The changes of each changed paragraph, by its reference.
export type PaperChanges = Record<string, TextChange[]>;

export function changesByRef(raw: unknown): PaperChanges {
  const parsed = ResponseSchema.safeParse(raw);
  if (!parsed.success) throw new ContentError("The changes since 1955 have an unknown shape", parsed.error);
  const out: PaperChanges = {};
  for (const row of parsed.data.data) {
    if (row.kind !== "text" || !row.applied) continue;
    (out[row.ref] ??= []).push({ year: row.year, before: row.before, after: row.after, reason: row.reason ?? null });
  }
  return out;
}

// The whole list is one answer of about 180 rows, so a build asks for it once, not once for each paper.
export async function fetchChanges(baseUrl: string): Promise<PaperChanges> {
  let raw: unknown;
  try {
    const res = await fetch(`${baseUrl}/editions/variants`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(String(res.status));
    raw = await res.json();
  } catch (cause) {
    throw new ContentError("The changes since 1955: the content API request failed", cause);
  }
  return changesByRef(raw);
}

// The part of the list for one paper.
export function changesOfPaper(all: PaperChanges, paperId: string): PaperChanges {
  return Object.fromEntries(Object.entries(all).filter(([ref]) => ref.split(":")[0] === paperId));
}
