export const MAX_QUERY = 200;

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

// The API refuses a text with no letter and no number. Such a text has no result.
export function hasWord(q: string): boolean {
  return /[A-Za-z0-9]/.test(q);
}

const QUESTION_WORD = /^(what|why|how|who|whom|when|where|which|is|are|was|were|does|do|did|can|could|will|should)\b/i;

export function startsLikeQuestion(q: string): boolean {
  return /\?\s*$/.test(q) || QUESTION_WORD.test(q);
}

// A question shows the related passages first: the exact words of a question are a weak guide.
// A long text with no question word is treated as a question too.
export function isQuestion(q: string): boolean {
  return startsLikeQuestion(q) || q.split(" ").length >= 5;
}

export function searchHref(q: string): string {
  return `/search?q=${encodeURIComponent(q)}`;
}
