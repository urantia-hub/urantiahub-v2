import { isCode } from "@/reader/share-link";

// A pair link: /s/{paragraph}[/{code}]/{work}/{passage}[/{code}]. Each code is optional, so the address has
// 3 to 5 parts after /s/. A work slug starts with a letter and is never a code.
export type PairParts = { ref: string; refCode: string; work: string; passage: string; passageCode: string };

const WORK = /^[a-z][a-z0-9-]*$/;

/** The parts of a pair address, or null for another shape. The paragraph and the passage are checked later. */
export function splitPairPath(parts: readonly string[]): PairParts | null {
  if (parts.length < 3 || parts.length > 5) return null;
  const [ref, ...rest] = parts;
  const refCode = isCode(rest[0]) ? (rest.shift() as string) : "";
  const [work, passage, passageCode = "", ...more] = rest;
  if (more.length > 0 || !work || !passage || !WORK.test(work) || isCode(work)) return null;
  if (passageCode !== "" && !isCode(passageCode)) return null;
  return { ref, refCode, work, passage, passageCode };
}

export function pairPath(p: PairParts): string {
  return ["/s", p.ref, p.refCode, p.work, p.passage, p.passageCode].filter(Boolean).join("/");
}
