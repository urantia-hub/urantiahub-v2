export type Part = { text: string; marked: boolean };

// Private marker characters for the start and the end of a matched word.
const OPEN = "\u0001";
const CLOSE = "\u0002";
const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

function decodeEntity(entity: string, body: string): string {
  if (body[0] !== "#") return ENTITIES[body] ?? entity;
  const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
  return Number.isFinite(code) && code > 31 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
}

// Paragraph HTML from the API to plain text. Matched words keep a marker, and a dot leader or a line break
// becomes a space. Marker characters that are in the source are removed first.
function toMarkedText(html: string): string {
  return html
    .replaceAll(OPEN, "")
    .replaceAll(CLOSE, "")
    .replace(/<span class="?urantia-dev-highlighted"?>([^<]*)<\/span>/g, `${OPEN}$1${CLOSE}`)
    .replace(/<span class="dot"><\/span>|<br\s*\/?>/g, " ")
    .replace(/<[^<>]*>/g, "")
    .replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, decodeEntity)
    .replace(/[ \t\n]+/g, " ")
    .trim();
}

function toParts(marked: string): Part[] {
  const parts: Part[] = [];
  for (const piece of marked.split(new RegExp(`(${OPEN}[^${CLOSE}]*${CLOSE})`))) {
    if (piece === "") continue;
    if (piece.startsWith(OPEN)) parts.push({ text: piece.slice(1, -1), marked: true });
    else parts.push({ text: piece.replaceAll(OPEN, "").replaceAll(CLOSE, ""), marked: false });
  }
  return parts;
}

// A cut point that is at a space and is not inside a marked word.
function cutBefore(marked: string, limit: number): number {
  let at = marked.lastIndexOf(" ", limit);
  while (at > 0 && marked.lastIndexOf(OPEN, at) > marked.lastIndexOf(CLOSE, at)) at = marked.lastIndexOf(" ", marked.lastIndexOf(OPEN, at));
  return at;
}

const EXACT_LENGTH = 260;
const RELATED_LENGTH = 240;

// About 260 characters around the first matched word, with each matched word marked.
export function exactSnippet(html: string): Part[] {
  const marked = toMarkedText(html);
  const first = marked.indexOf(OPEN);
  const start = first > 150 ? marked.lastIndexOf(" ", first - 90) + 1 : 0;
  let end = marked.length;
  if (marked.length - start > EXACT_LENGTH) {
    const cut = cutBefore(marked, start + EXACT_LENGTH);
    if (cut > start) end = cut;
  }
  const parts = toParts(marked.slice(start, end));
  if (start > 0) parts.unshift({ text: "… ", marked: false });
  if (end < marked.length) parts.push({ text: " …", marked: false });
  return parts;
}

// The start of the paragraph, with no marks.
export function relatedSnippet(html: string): Part[] {
  const plain = toMarkedText(html).replaceAll(OPEN, "").replaceAll(CLOSE, "");
  if (plain.length <= RELATED_LENGTH) return [{ text: plain, marked: false }];
  const cut = plain.lastIndexOf(" ", RELATED_LENGTH);
  return [{ text: `${plain.slice(0, cut > 0 ? cut : RELATED_LENGTH)} …`, marked: false }];
}
