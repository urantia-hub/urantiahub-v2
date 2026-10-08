export const MAX_QUERY = 200;

// One form for each query: trimmed, single spaces, and a length limit. The cache key uses this form.
export function normalizeQuery(raw: string | string[] | undefined): string {
  const text = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY).trim();
}

const QUESTION_WORD = /^(what|why|how|who|whom|when|where|which|is|are|was|were|does|do|did|can|could|will|should)\b/i;

// A question shows the related passages first: the exact words of a question are a weak guide.
export function isQuestion(q: string): boolean {
  return /\?\s*$/.test(q) || QUESTION_WORD.test(q) || q.split(" ").length >= 5;
}

export function searchHref(q: string): string {
  return `/search?q=${encodeURIComponent(q)}`;
}
