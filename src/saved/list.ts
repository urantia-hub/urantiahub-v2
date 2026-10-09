// The Saved page works on one loaded list: it filters, searches, and sorts in the browser.
import type { SavedEntry } from "@/account/saved-data";

export type Kind = "all" | "paragraphs" | "notes";
export type Order = "newest" | "paper";

const hay = (entry: SavedEntry) => [entry.ref, entry.paperTitle, entry.text, ...entry.notes.map((note) => note.text)].join("\n").toLowerCase();

// Each word of the search must be somewhere in the entry: its notes, its paragraph, its reference, or its paper.
export function pick(entries: readonly SavedEntry[], kind: Kind, query: string): SavedEntry[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return entries.filter((entry) => {
    if (kind === "paragraphs" && entry.savedAt === null) return false;
    if (kind === "notes" && entry.notes.length === 0) return false;
    if (words.length === 0) return true;
    const text = hay(entry);
    return words.every((word) => text.includes(word));
  });
}

// The time of the last thing that the reader did with the paragraph.
export function latest(entry: SavedEntry): string {
  return [entry.savedAt ?? "", ...entry.notes.map((note) => note.at)].reduce((a, b) => (a > b ? a : b));
}

const numbers = (ref: string) => ref.split(/[:.]/).map(Number);
function byText(a: SavedEntry, b: SavedEntry): number {
  const [x, y] = [numbers(a.ref), numbers(b.ref)];
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
}

export function sortEntries(entries: readonly SavedEntry[], order: Order): SavedEntry[] {
  return [...entries].sort(order === "paper" ? byText : (a, b) => latest(b).localeCompare(latest(a)) || byText(a, b));
}

export function groupByPaper(sorted: readonly SavedEntry[]): { paperId: string; title: string; entries: SavedEntry[] }[] {
  const groups: { paperId: string; title: string; entries: SavedEntry[] }[] = [];
  for (const entry of sorted) {
    const last = groups.at(-1);
    if (last?.paperId === entry.paperId) last.entries.push(entry);
    else groups.push({ paperId: entry.paperId, title: entry.paperId === "0" ? entry.paperTitle : `Paper ${entry.paperId} · ${entry.paperTitle}`, entries: [entry] });
  }
  return groups;
}
