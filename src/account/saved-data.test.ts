// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { addNote, changeNote, deleteNote, NOTE_MAX, readAllSaved, readSavedForPaper, removeBookmark, type SavedGateway, saveBookmark } from "./saved-data";

const ID = "3f2b8c1e-0d4a-4b6f-9a7e-1c2d3e4f5a6b";
type Mark = { ref: string; paperId: string; paperTitle: string; text: string; at: string };
type Note = Mark & { id: string; note: string };
const mark = (ref: string, at = "2026-10-01T00:00:00.000Z"): Mark => ({ ref, paperId: ref.split(":")[0], paperTitle: `Paper ${ref.split(":")[0]}`, text: `Text of ${ref}`, at });
const note = (id: string, ref: string, text: string, at = "2026-10-02T00:00:00.000Z"): Note => ({ ...mark(ref, at), id, note: text });

function gateway(bookmarks: Mark[] = [], notes: Note[] = []) {
  const page = <T extends Mark>(all: T[], paperId: string | undefined, n: number) => {
    const of = paperId ? all.filter((x) => x.paperId === paperId) : all;
    return { items: of.slice(n * 100, n * 100 + 100), total: of.length };
  };
  return {
    bookmarks: vi.fn(async (_t: string, q: { paperId?: string; page: number }) => page(bookmarks, q.paperId, q.page)),
    notes: vi.fn(async (_t: string, q: { paperId?: string; page: number }) => page(notes, q.paperId, q.page)),
    addBookmark: vi.fn(async () => {}),
    removeBookmark: vi.fn(async () => {}),
    addNote: vi.fn(async (_t: string, ref: string, text: string) => note(ID, ref, text)),
    changeNote: vi.fn(async (_t: string, id: string, text: string): Promise<Note | null> => note(id, "1:0.3", text)),
    deleteNote: vi.fn(async () => {}),
  } satisfies SavedGateway;
}

describe("what the reader saved in one paper", () => {
  it("is the saved references and the notes, oldest note first", async () => {
    const g = gateway([mark("1:0.3"), mark("2:1.1")], [note("b", "1:0.3", "second", "2026-10-05T00:00:00.000Z"), note("a", "1:0.3", "first", "2026-10-03T00:00:00.000Z"), note("c", "2:0.1", "other")]);
    expect(await readSavedForPaper(g, "t", "1")).toEqual({
      bookmarks: ["1:0.3"],
      notes: [
        { id: "a", ref: "1:0.3", text: "first", at: "2026-10-03T00:00:00.000Z" },
        { id: "b", ref: "1:0.3", text: "second", at: "2026-10-05T00:00:00.000Z" },
      ],
    });
  });

  it("reads each page of a long list", async () => {
    const many = Array.from({ length: 230 }, (_, i) => note(`n${i}`, "1:0.3", `note ${i}`));
    const g = gateway([], many);
    expect((await readSavedForPaper(g, "t", "1")).notes).toHaveLength(230);
    expect(g.notes).toHaveBeenCalledTimes(3);
  });

  it("asks nothing for a paper that does not exist", async () => {
    const g = gateway([mark("1:0.3")]);
    expect(await readSavedForPaper(g, "t", "900")).toEqual({ bookmarks: [], notes: [] });
    expect(g.bookmarks).not.toHaveBeenCalled();
  });
});

describe("all that the reader saved", () => {
  it("is one entry for each paragraph, with its notes", async () => {
    const g = gateway([mark("1:0.3", "2026-10-01T00:00:00.000Z")], [note("a", "1:0.3", "first"), note("c", "2:0.1", "other")]);
    expect(await readAllSaved(g, "t")).toEqual({
      cut: false,
      entries: [
        { ref: "1:0.3", paperId: "1", paperTitle: "Paper 1", text: "Text of 1:0.3", savedAt: "2026-10-01T00:00:00.000Z", notes: [{ id: "a", ref: "1:0.3", text: "first", at: "2026-10-02T00:00:00.000Z" }] },
        { ref: "2:0.1", paperId: "2", paperTitle: "Paper 2", text: "Text of 2:0.1", savedAt: null, notes: [{ id: "c", ref: "2:0.1", text: "other", at: "2026-10-02T00:00:00.000Z" }] },
      ],
    });
  });

  it("stops at 2,000 of a kind and says so", async () => {
    const many = Array.from({ length: 2300 }, (_, i) => note(`n${i}`, "1:0.3", "x"));
    const g = gateway([], many);
    const all = await readAllSaved(g, "t");
    expect(all.cut).toBe(true);
    expect(all.entries[0].notes).toHaveLength(2000);
    expect(g.notes).toHaveBeenCalledTimes(20);
  });
});

describe("a save and a removal of a paragraph", () => {
  it("go to the API for a reference of a paper that exists", async () => {
    const g = gateway();
    expect(await saveBookmark(g, "t", { ref: "1:0.3" })).toEqual({ ok: true });
    expect(await removeBookmark(g, "t", "1:0.3")).toEqual({ ok: true });
    expect(g.addBookmark).toHaveBeenCalledWith("t", "1:0.3");
    expect(g.removeBookmark).toHaveBeenCalledWith("t", "1:0.3");
  });

  it.each([[{ ref: "900:0.3" }], [{ ref: "1:0.3/../x" }], [{ ref: 5 }], [null]])("refuse %j with no call", async (value) => {
    const g = gateway();
    expect(await saveBookmark(g, "t", value)).toEqual({ ok: false, why: "bad" });
    expect(await removeBookmark(g, "t", (value as { ref?: unknown } | null)?.ref)).toEqual({ ok: false, why: "bad" });
    expect(g.addBookmark).not.toHaveBeenCalled();
    expect(g.removeBookmark).not.toHaveBeenCalled();
  });
});

describe("a note", () => {
  it("is added with its text trimmed, and comes back with its id", async () => {
    const g = gateway();
    expect(await addNote(g, "t", { ref: "1:0.3", text: "  hello  " })).toEqual({ ok: true, note: { id: ID, ref: "1:0.3", text: "hello", at: "2026-10-02T00:00:00.000Z" } });
    expect(g.addNote).toHaveBeenCalledWith("t", "1:0.3", "hello");
  });

  it.each([[{ ref: "1:0.3", text: "   " }], [{ ref: "1:0.3", text: "x".repeat(NOTE_MAX + 1) }], [{ ref: "900:1.1", text: "x" }], [{ ref: "1:0.3" }]])("is refused with no call: %#", async (value) => {
    const g = gateway();
    expect(await addNote(g, "t", value)).toEqual({ ok: false, why: "bad" });
    expect(g.addNote).not.toHaveBeenCalled();
  });

  it("takes a text of the largest size", async () => {
    expect((await addNote(gateway(), "t", { ref: "1:0.3", text: "x".repeat(NOTE_MAX) })).ok).toBe(true);
  });

  it("is changed by its id", async () => {
    const g = gateway();
    expect(await changeNote(g, "t", ID, { text: "new" })).toEqual({ ok: true, note: { id: ID, ref: "1:0.3", text: "new", at: "2026-10-02T00:00:00.000Z" } });
  });

  it("says that a note is gone", async () => {
    const g = gateway();
    g.changeNote.mockResolvedValueOnce(null);
    expect(await changeNote(g, "t", ID, { text: "new" })).toEqual({ ok: false, why: "gone" });
  });

  it("refuses an id that is not an id, with no call", async () => {
    const g = gateway();
    expect(await changeNote(g, "t", "../bookmarks", { text: "new" })).toEqual({ ok: false, why: "bad" });
    expect(await deleteNote(g, "t", "x")).toEqual({ ok: false, why: "bad" });
    expect(g.changeNote).not.toHaveBeenCalled();
    expect(g.deleteNote).not.toHaveBeenCalled();
  });

  it("is deleted by its id", async () => {
    const g = gateway();
    expect(await deleteNote(g, "t", ID)).toEqual({ ok: true });
    expect(g.deleteNote).toHaveBeenCalledWith("t", ID);
  });
});
