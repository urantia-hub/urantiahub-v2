// The paragraphs that the reader saved and the reader's notes. The API calls a saved paragraph a
// bookmark. A browser sends the values, so each function checks them before a call.

import { paperById } from "@/content/paper-index";

export { NOTE_MAX } from "./note-limit";
import { NOTE_MAX } from "./note-limit";
const PAGE = 100;
const MOST = 2000;
const REF = /^(\d{1,3}):\d{1,3}\.\d{1,3}$/;
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type GatewayMark = { ref: string; paperId: string; paperTitle: string; text: string; at: string };
type GatewayNote = GatewayMark & { id: string; note: string; changedAt: string };
type Query = { paperId?: string; page: number };

export type SavedGateway = {
  bookmarks(accessToken: string, query: Query): Promise<{ items: GatewayMark[]; total: number }>;
  notes(accessToken: string, query: Query): Promise<{ items: GatewayNote[]; total: number }>;
  addBookmark(accessToken: string, ref: string): Promise<void>;
  removeBookmark(accessToken: string, ref: string): Promise<void>;
  addNote(accessToken: string, ref: string, text: string): Promise<GatewayNote>;
  // Changes the note only if it is unchanged since changedAt. "changed" gives the note as it is now. Null when the note is gone.
  changeNote(accessToken: string, id: string, text: string, changedAt: string): Promise<{ status: "updated" | "changed"; note: GatewayNote } | null>;
  deleteNote(accessToken: string, id: string): Promise<void>;
};

// `changedAt` is the time of the last change, which the next change sends back.
export type SavedNote = { id: string; ref: string; text: string; at: string; changedAt: string };
export type PaperSaved = { bookmarks: string[]; notes: SavedNote[] };
export type SavedEntry = { ref: string; paperId: string; paperTitle: string; text: string; savedAt: string | null; notes: SavedNote[] };
export type AllSaved = { entries: SavedEntry[]; cut: boolean };
export type Done = { ok: true } | { ok: false; why: "bad" | "gone" };
export type NoteDone = { ok: true; note: SavedNote } | { ok: false; why: "changed"; note: SavedNote } | { ok: false; why: "bad" | "gone" };

const BAD = { ok: false, why: "bad" } as const;

export function isRef(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const paper = REF.exec(value)?.[1];
  return paper !== undefined && paperById(paper) !== undefined;
}

const toNote = (n: GatewayNote): SavedNote => ({ id: n.id, ref: n.ref, text: n.note, at: n.at, changedAt: n.changedAt });
const TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/;
const oldestFirst = (a: SavedNote, b: SavedNote) => a.at.localeCompare(b.at);

// Each page of one list, up to the limit. `cut` says that the list is longer than the limit.
async function every<T>(read: (page: number) => Promise<{ items: T[]; total: number }>): Promise<{ items: T[]; cut: boolean }> {
  const items: T[] = [];
  for (let page = 0; page < MOST / PAGE; page++) {
    const got = await read(page);
    items.push(...got.items);
    if (got.items.length < PAGE || items.length >= got.total) return { items, cut: false };
  }
  return { items, cut: true };
}

export async function readSavedForPaper(gateway: SavedGateway, accessToken: string, paperId: unknown): Promise<PaperSaved> {
  if (typeof paperId !== "string" || !paperById(paperId)) return { bookmarks: [], notes: [] };
  const [bookmarks, notes] = await Promise.all([
    every((page) => gateway.bookmarks(accessToken, { paperId, page })),
    every((page) => gateway.notes(accessToken, { paperId, page })),
  ]);
  return { bookmarks: bookmarks.items.map((b) => b.ref), notes: notes.items.map(toNote).sort(oldestFirst) };
}

export async function readAllSaved(gateway: SavedGateway, accessToken: string): Promise<AllSaved> {
  const [bookmarks, notes] = await Promise.all([every((page) => gateway.bookmarks(accessToken, { page })), every((page) => gateway.notes(accessToken, { page }))]);
  const entries = new Map<string, SavedEntry>();
  const entry = (of: GatewayMark) => {
    let found = entries.get(of.ref);
    if (!found) entries.set(of.ref, (found = { ref: of.ref, paperId: of.paperId, paperTitle: of.paperTitle, text: of.text, savedAt: null, notes: [] }));
    return found;
  };
  for (const b of bookmarks.items) entry(b).savedAt = b.at;
  for (const n of notes.items) entry(n).notes.push(toNote(n));
  for (const e of entries.values()) e.notes.sort(oldestFirst);
  return { entries: [...entries.values()], cut: bookmarks.cut || notes.cut };
}

const field = (value: unknown, name: string): unknown => (typeof value === "object" && value !== null ? (value as Record<string, unknown>)[name] : undefined);

function noteText(value: unknown): string | null {
  const given = field(value, "text");
  if (typeof given !== "string") return null;
  const text = given.trim();
  return text.length > 0 && text.length <= NOTE_MAX ? text : null;
}

export async function saveBookmark(gateway: SavedGateway, accessToken: string, value: unknown): Promise<Done> {
  const ref = field(value, "ref");
  if (!isRef(ref)) return BAD;
  await gateway.addBookmark(accessToken, ref);
  return { ok: true };
}

export async function removeBookmark(gateway: SavedGateway, accessToken: string, ref: unknown): Promise<Done> {
  if (!isRef(ref)) return BAD;
  await gateway.removeBookmark(accessToken, ref);
  return { ok: true };
}

export async function addNote(gateway: SavedGateway, accessToken: string, value: unknown): Promise<NoteDone> {
  const ref = field(value, "ref");
  const text = noteText(value);
  if (!isRef(ref) || text === null) return BAD;
  return { ok: true, note: toNote(await gateway.addNote(accessToken, ref, text)) };
}

export async function changeNote(gateway: SavedGateway, accessToken: string, id: unknown, value: unknown): Promise<NoteDone> {
  const text = noteText(value);
  const changedAt = field(value, "changedAt");
  if (typeof id !== "string" || !ID.test(id) || text === null || typeof changedAt !== "string" || !TIME.test(changedAt)) return BAD;
  const answer = await gateway.changeNote(accessToken, id, text, changedAt);
  if (!answer) return { ok: false, why: "gone" };
  return answer.status === "updated" ? { ok: true, note: toNote(answer.note) } : { ok: false, why: "changed", note: toNote(answer.note) };
}

export async function deleteNote(gateway: SavedGateway, accessToken: string, id: unknown): Promise<Done> {
  if (typeof id !== "string" || !ID.test(id)) return BAD;
  await gateway.deleteNote(accessToken, id);
  return { ok: true };
}
