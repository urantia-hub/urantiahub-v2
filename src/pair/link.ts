import type { Lang } from "@/i18n/lang";
import { isCode } from "@/reader/share-link";

// A pair link: /s/{paragraph}[/{code}]/{work}/{passage}[/{code}]. Each code is optional, so the address has
// 3 to 5 parts after /s/. A work slug starts with a letter and is never a code. A part of another form in the
// place of a code counts as no code, so the page goes to the address without it.
export type PairParts = { ref: string; refCode: string; work: string; passage: string; passageCode: string };

const WORK = /^[a-z][a-z0-9-]*$/;

/** The parts of a pair address, or null for another shape. The paragraph and the passage are checked later. */
export function splitPairPath(parts: readonly string[]): PairParts | null {
  if (parts.length < 3 || parts.length > 5) return null;
  const [ref, ...rest] = parts;
  // The paragraph has a code when five parts come, or when four come and the second is no work.
  const codeFirst = rest.length === 4 || (rest.length === 3 && (isCode(rest[0]) || !WORK.test(rest[0])));
  const first = codeFirst ? (rest.shift() as string) : "";
  const [work, passage, last = ""] = rest;
  if (!WORK.test(work) || isCode(work)) return null;
  const code = (part: string) => (isCode(part) ? part : "");
  return { ref, refCode: code(first), work, passage, passageCode: code(last) };
}

// A Spanish pair is the same parts under `/es/s/`.
export function pairPath(p: PairParts, lang: Lang = "en"): string {
  return [lang === "es" ? "/es/s" : "/s", p.ref, p.refCode, p.work, p.passage, p.passageCode].filter(Boolean).join("/");
}
