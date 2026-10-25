import { type Unit, unitsText } from "@/image/compose";
import { cutWords, unitCode } from "@/reader/share-link";
import type { Lang } from "@/i18n/lang";
import { pairPath } from "./link";

// A pair as the browser holds it: plain data, so the page can change the choice with no server.
// `base` and `hash` are the address that opens a side, before and after its `?s=`. `card` is the name on the card.
export type ViewSide = { eyebrow: string; card: string; kind: string | null; units: Unit[]; source: string; shortRef: string; base: string; hash: string };
// `lang` is the language of the page: its words and its address (English when absent).
export type ViewPair = { work: string; refPart: string; passagePart: string; a: ViewSide; b: ViewSide; lang?: Lang };
export type Chosen = { a: ReadonlySet<number>; b: ReadonlySet<number> };

const whole = (side: ViewSide, chosen: ReadonlySet<number>) => chosen.size === 0 || chosen.size >= side.units.length;

/** The words of a side: all of it, or the chosen units with "…" for each cut. */
export const wordsOf = (side: ViewSide, chosen: ReadonlySet<number>) => (whole(side, chosen) ? side.units.map((u) => u.text).join(" ") : unitsText(side.units, chosen));

export const targetOf = (side: ViewSide, chosen: ReadonlySet<number>) => {
  const code = unitCode(chosen, side.units);
  return `${side.base}${code ? `?s=${code}` : ""}${side.hash}`;
};

export const pathOf = (pair: ViewPair, chosen: Chosen) => pairPath({ ref: pair.refPart, refCode: unitCode(chosen.a, pair.a.units), work: pair.work, passage: pair.passagePart, passageCode: unitCode(chosen.b, pair.b.units) }, pair.lang);

/** The quote of a side on the card: cut at a word at about 210 characters. */
export const cardQuote = (words: string) => cutWords(words, 210);

/** ONE type size for both quotes on the card, from the longer one, so the two sides look equal. */
export const pairSize = (longest: number) => (longest < 90 ? 44 : longest <= 170 ? 36 : 30);
