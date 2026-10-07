const LAST_PAPER = 196;

// Builds the same slugs as the live Hub, so no paper URL changes at cutover.
export function slugify(id: string, title: string): string {
  if (id === "0") return "foreword";
  const kebab = title
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `paper-${id}-${kebab}`;
}

// The id alone decides the paper. The title part of a slug is not checked here.
export function idFromSlug(slug: string): string | null {
  const lower = slug.toLowerCase();
  if (lower === "foreword") return "0";
  const match = /^(?:paper-)?(\d{1,3})(?:-.*)?$/.exec(lower);
  if (!match) return null;
  const n = Number(match[1]);
  return n <= LAST_PAPER ? String(n) : null;
}

export type ParsedReference = { paperId: string; sectionId?: string; paragraphId?: string };

const REFERENCE = /^[\s(]*(?:paper\s*)?(\d{1,3})(?:\s*:\s*(\d{1,2})(?:\s*\.\s*(\d{1,3}))?)?[\s)]*$/i;

// Accepts "99", "99:1", and "99:1.1", with spaces, parentheses, or a leading "Paper".
export function parseReference(input: string): ParsedReference | null {
  const match = REFERENCE.exec(input);
  if (!match) return null;
  const paper = Number(match[1]);
  if (paper > LAST_PAPER) return null;
  const ref: ParsedReference = { paperId: String(paper) };
  if (match[2] !== undefined) ref.sectionId = String(Number(match[2]));
  if (match[3] !== undefined) ref.paragraphId = String(Number(match[3]));
  return ref;
}

export function anchorFor(ref: ParsedReference): string {
  if (ref.sectionId === undefined) return "";
  const section = `#${ref.paperId}:${ref.sectionId}`;
  return ref.paragraphId === undefined ? section : `${section}.${ref.paragraphId}`;
}
