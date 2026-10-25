export const MAX_QUERY = 200;

// The meaning search in Spanish ("Relacionados"). On since API task A4 passed its bar (2026-10-23).
export const SPANISH_RELATED = true;

// One form for each query: no control characters, no half characters, single spaces, and a length limit.
// The limit counts whole characters, so a cut never leaves half of one, and the address can always be built.
export function normalizeQuery(raw: string | string[] | undefined): string {
  const text = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  const clean = text
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    // A high half with no low half after it, and a low half with no high half before it.
    .replace(/[\ud800-\udbff](?![\udc00-\udfff])/g, "")
    .replace(/(^|[^\ud800-\udbff])[\udc00-\udfff]/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return Array.from(clean).slice(0, MAX_QUERY).join("").trim();
}

// The form that the cache uses as its key. "Soul" and "soul" are one search.
export function queryKey(q: string): string {
  return normalizeQuery(q).toLowerCase();
}

// The API refuses a text with no letter and no number. Such a text has no result. A letter is a Latin one,
// with or without an accent ("ñ", "é"); the API reads no other script.
export function hasWord(q: string): boolean {
  return /[\p{Script=Latin}0-9]/u.test(q);
}

const QUESTION_WORD = /^(what|why|how|who|whom|when|where|which|is|are|was|were|does|do|did|can|could|will|should)\b/i;

// `\b` reads "é" as no letter, so the Spanish words end where no letter follows. A reader often types
// them with no accent ("que es dios").
const QUESTION_WORD_ES = /^¿?\s*(qu[eé]|qui[eé]n(?:es)?|c[oó]mo|a?d[oó]nde|cu[aá]ndo|por qu[eé]|cu[aá]l(?:es)?)(?!\p{L})/iu;

export function startsLikeQuestion(q: string): boolean {
  return /\?\s*$/.test(q) || QUESTION_WORD.test(q) || QUESTION_WORD_ES.test(q);
}

// A question shows the related passages first: the exact words of a question are a weak guide.
// A long text with no question word is treated as a question too.
export function isQuestion(q: string): boolean {
  return startsLikeQuestion(q) || q.split(" ").length >= 5;
}

export function searchHref(q: string): string {
  return `/search?q=${encodeURIComponent(q)}`;
}
