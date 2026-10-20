import "server-only";
import * as content from "@/content";
import { ParagraphNotFound } from "@/content/fetchers";
import { type LibraryWork, PageNotFound, type WorkPage, type WorkPassage } from "@/content/library";
import { paperById, paperPath } from "@/content/paper-index";
import { type Unit, units } from "@/image/compose";
import { BIBLE } from "@/library/bible";
import { pageOfRef } from "@/library/refs";
import { parseUnitCode, refForLink, refFromLink, unitCode, unitWords } from "@/reader/share-link";
import { surname } from "@/server/parallels";
import { pairPath, splitPairPath } from "./link";
import { passageForLink, passageFromLink, passageText } from "./passage";

// One side of a pair: the work, the text as units with the reader's choice, and the place that opens it.
export type PairSide = { eyebrow: string; kind: string | null; units: Unit[]; chosen: ReadonlySet<number>; words: string; source: string; shortRef: string; target: string };
export type Pair = { path: string; work: string; a: PairSide; b: PairSide };

export type PairDeps = {
  paragraphText: (paperId: string, ref: string) => Promise<string>;
  library: () => Promise<LibraryWork[]>;
  workPages: (slug: string) => Promise<WorkPage[]>;
  workPage: (slug: string, key: string) => Promise<WorkPassage[]>;
};

const DEPS: PairDeps = {
  paragraphText: (paperId, ref) => content.getParagraphText(paperId, ref),
  library: () => content.getLibrary(),
  workPages: (slug) => content.getWorkPages(slug),
  workPage: (slug, key) => content.getWorkPage(slug, key),
};

// A missing paragraph or page is null (a 404). Each other error is thrown, so an outage is not kept as a 404.
async function orNull<T>(call: Promise<T>): Promise<T | null> {
  try {
    return await call;
  } catch (error) {
    if (error instanceof ParagraphNotFound || error instanceof PageNotFound) return null;
    throw error;
  }
}

// The units of a text and the choice that a code names. A code that does not fit is no choice.
function side(text: string, code: string) {
  const all = units(text);
  const chosen = (code && parseUnitCode(code, all)) || new Set<number>();
  return { all, chosen, code: unitCode(chosen, all), words: unitWords(text, chosen) };
}

/** The pair that an address names, `{ go }` for the one form of the same pair, or null when a part is not there. */
export async function pairOf(parts: readonly string[], deps: PairDeps = DEPS): Promise<Pair | { go: string } | null> {
  const split = splitPairPath(parts);
  if (!split) return null;
  // The form with a colon arrives with its escape.
  const ref = refFromLink(split.ref.replace(/%3A/i, ":"));
  const paper = ref ? paperById(ref.split(":")[0]) : undefined;
  if (!ref || !paper) return null;
  const text = await orNull(deps.paragraphText(paper.id, ref));
  if (text === null) return null;
  const work = (await deps.library()).find((w) => w.slug === split.work);
  if (!work) return null;
  const pages = await orNull(deps.workPages(work.slug));
  const asked = pages && passageFromLink(split.passage, work, pages);
  const page = pages && asked ? pageOfRef(work.refLevels, pages, asked) : null;
  if (!pages || !asked || !page) return null;
  const passages = await orNull(deps.workPage(work.slug, page.key));
  // The pair names the passage that the reader saw: a number inside a joined passage names that passage.
  const found = passages && passageText(asked, passages);
  if (!found) return null;

  const a = side(text, split.refCode);
  const b = side(found.text, split.passageCode);
  const path = pairPath({ ref: refForLink(ref), refCode: a.code, work: work.slug, passage: passageForLink(found.ref, work, pages), passageCode: b.code });
  if (path !== `/s/${parts.join("/")}`) return { go: path };
  const query = (code: string) => (code ? `?s=${code}` : "");
  return {
    path,
    work: work.slug,
    a: { eyebrow: "The Urantia Papers", kind: null, units: a.all, chosen: a.chosen, words: a.words, source: `${ref} · ${paper.title}`, shortRef: ref, target: `${paperPath(paper.id)}${query(a.code)}#${ref}` },
    b: {
      eyebrow: work.title,
      kind: `${work.tradition} ${work.kind}`,
      units: b.all,
      chosen: b.chosen,
      words: b.words,
      source: `${found.ref} · ${work.slug === BIBLE ? "World English Bible" : [surname(work.translator), work.year].filter((x) => x !== null).join(", ")}`,
      shortRef: found.ref,
      target: `/texts/${work.slug}/at/${encodeURIComponent(found.ref)}${query(b.code)}`,
    },
  };
}
