// One change of the words of a paragraph since the first printing of 1955.
// `year` is the year of the report that adopted it; null when no report names it.
// `reason` is the words of Urantia Foundation's list, or null when the list has none.
export type TextChange = { year: number | null; before: string; after: string; reason: string | null };

export type Part = { text: string; changed?: boolean };
export type ChangeLines = { was: Part[]; now: Part[] };

// The words that the two forms share at each end stay plain; the words between them are the change.
// A side with no words of its own (an insertion) has no changed part.
export function changeLines(before: string, after: string): ChangeLines {
  const a = before.split(" ");
  const b = after.split(" ");
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tail = 0;
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++;
  const line = (words: string[]): Part[] => {
    const start = words.slice(0, head).join(" ");
    const middle = words.slice(head, words.length - tail).join(" ");
    const end = words.slice(words.length - tail).join(" ");
    const parts: Part[] = [];
    const add = (text: string, changed?: boolean) => {
      if (!text) return;
      if (parts.length > 0) parts.push({ text: " " });
      parts.push(changed ? { text, changed } : { text });
    };
    add(start);
    add(middle, true);
    add(end);
    // A line that ends its sentence needs no mark after it.
    const ends = /[.!?][”’"')]*$/.test(words.join(" "));
    return [{ text: "…" }, ...parts, ...(ends ? [] : [{ text: "…" }])];
  };
  return { was: line(a), now: line(b) };
}
