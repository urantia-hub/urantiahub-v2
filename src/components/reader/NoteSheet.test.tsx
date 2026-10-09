import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAccountForTest, startAccount } from "@/account/client";
import { loadSaved, resetSavedForTest } from "@/account/saved";
import { resetSyncForTest } from "@/account/sync";
import NoteSheet from "./NoteSheet";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/analytics", () => ({ track }));

type Answer = (url: string, init?: RequestInit) => Response | Promise<Response>;
const NOTES = [
  { id: "n1", ref: "1:0.3", text: "The first note.", at: "2026-10-01T00:00:00.000Z" },
  { id: "n2", ref: "1:0.3", text: "The second note.", at: "2026-10-05T00:00:00.000Z" },
  { id: "n3", ref: "1:0.5", text: "On another paragraph.", at: "2026-10-05T00:00:00.000Z" },
];
const clearCookies = () => {
  for (const part of document.cookie.split(";")) document.cookie = `${part.split("=")[0].trim()}=; max-age=0; path=/`;
};

async function open(write: Answer = () => Response.json({ ok: true }), notes = NOTES, load: Answer = () => Response.json({ bookmarks: [], notes })) {
  document.cookie = "hub_in=1; path=/";
  resetAccountForTest(true);
  const fetch = vi.fn(async (url: string, init?: RequestInit) => (url === "/api/auth/session" ? Response.json({ user: { name: "Ana", email: null, key: "k1" } }) : url.startsWith("/api/me/saved") ? load(url, init) : write(url, init)));
  vi.stubGlobal("fetch", fetch);
  await act(async () => {
    await startAccount();
    await loadSaved("1");
  });
  const onClose = vi.fn();
  render(<NoteSheet reference="1:0.3" paperId="1" onClose={onClose} />);
  return { fetch, onClose };
}
const list = () => screen.getByRole("list", { name: "Your notes" });
const items = () => within(list()).getAllByRole("listitem");
const sent = (fetch: ReturnType<typeof vi.fn>) => fetch.mock.calls.filter(([url]) => String(url).startsWith("/api/me/notes")).map(([url, init]) => [`${(init as RequestInit).method} ${url}`, (init as RequestInit).body]);

beforeEach(() => {
  track.mockClear();
  clearCookies();
  resetSyncForTest();
  resetSavedForTest();
});
afterEach(() => {
  vi.unstubAllGlobals();
  resetAccountForTest(false);
  clearCookies();
});

describe("the notes of a paragraph", () => {
  it("are a thread of this paragraph only: the oldest first, and the field at the end", async () => {
    await open();
    const sheet = screen.getByRole("dialog", { name: "Your notes on 1:0.3" });
    expect(sheet).toHaveTextContent("Only you see them.");
    expect(items().map((item) => item.querySelector(".note-text")?.textContent)).toEqual(["The first note.", "The second note."]);
    const field = screen.getByRole("textbox", { name: "Add a note" });
    expect(list().compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows Save only when the field has text, and adds the note at the end", async () => {
    const { fetch } = await open(() => Response.json({ ok: true, note: { id: "n9", ref: "1:0.3", text: "A new one.", at: "2026-10-09T00:00:00.000Z" } }));
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    await userEvent.type(screen.getByRole("textbox", { name: "Add a note" }), "   ");
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    await userEvent.type(screen.getByRole("textbox", { name: "Add a note" }), " A new one. ");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(items()).toHaveLength(3);
    expect(items()[2]).toHaveTextContent("A new one.");
    expect(screen.getByRole("textbox", { name: "Add a note" })).toHaveValue("");
    expect(sent(fetch)).toEqual([["POST /api/me/notes", JSON.stringify({ ref: "1:0.3", text: "A new one." })]]);
    // The count for us holds no text and no reference.
    expect(track.mock.calls).toEqual([["note_saved", { paper_id: "1", kind: "new" }]]);
  });

  it("keeps the text in the field and says so when the save fails", async () => {
    await open(() => new Response("", { status: 503 }));
    await userEvent.type(screen.getByRole("textbox", { name: "Add a note" }), "Do not lose me.");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("alert")).toHaveTextContent("The note did not save. Try again.");
    expect(track).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "Add a note" })).toHaveValue("Do not lose me.");
    expect(items()).toHaveLength(2);
  });

  // The field takes a text that is too long, so that a paste loses nothing. The reader trims it.
  it("counts down near the limit, shows how much is too much, and saves only a text that fits", async () => {
    const { fetch } = await open();
    const field = screen.getByRole("textbox", { name: "Add a note" });
    expect(field).not.toHaveAttribute("maxlength");
    await userEvent.click(field);
    await userEvent.paste("x".repeat(4000));
    expect(screen.queryByRole("status", { name: /characters/ })).toBeNull();
    await userEvent.paste("x".repeat(850));
    expect(screen.getByRole("status", { name: "150 characters left" })).toHaveTextContent("150");
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    await userEvent.paste("x".repeat(382));
    const over = screen.getByRole("status", { name: "232 characters too many" });
    expect(over).toHaveTextContent("-232");
    expect(over).toHaveClass("over");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(sent(fetch)).toEqual([]);
  });

  it("cuts a long note to a few lines until Read more, in the sheet", async () => {
    await open(undefined, [{ id: "n1", ref: "1:0.3", text: "A long note. ".repeat(60).trim(), at: "2026-10-01T00:00:00.000Z" }, NOTES[1]]);
    const text = items()[0].querySelector(".note-text")!;
    expect(text).toHaveClass("clamp");
    await userEvent.click(within(items()[0]).getByRole("button", { name: "Read more" }));
    expect(text).not.toHaveClass("clamp");
    await userEvent.click(within(items()[0]).getByRole("button", { name: "Show less" }));
    expect(text).toHaveClass("clamp");
    expect(within(items()[1]).queryByRole("button", { name: "Read more" })).toBeNull();
  });

  it("says that there are too many requests, and keeps the text", async () => {
    await open(() => new Response("", { status: 429 }));
    await userEvent.type(screen.getByRole("textbox", { name: "Add a note" }), "Wait for me.");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Too many requests for now. Wait a minute, then try again.");
    expect(screen.getByRole("textbox", { name: "Add a note" })).toHaveValue("Wait for me.");
  });

  it("shows a note with markup characters as plain text", async () => {
    await open(undefined, [{ id: "n1", ref: "1:0.3", text: '<img src=x onerror="alert(1)"> & <b>bold</b>', at: "2026-10-01T00:00:00.000Z" }]);
    expect(items()[0].querySelector(".note-text")?.textContent).toBe('<img src=x onerror="alert(1)"> & <b>bold</b>');
    expect(list().querySelector("img, b")).toBeNull();
  });
});

describe("Edit", () => {
  it("changes one note in its place, and the other notes stay", async () => {
    const { fetch } = await open(() => Response.json({ ok: true, note: { ...NOTES[1], text: "Changed." } }));
    await userEvent.click(within(items()[1]).getByRole("button", { name: "Edit" }));
    const field = screen.getByRole("textbox", { name: "Your note" });
    expect(field).toHaveValue("The second note.");
    expect(field).toHaveFocus();
    // The field for a new note waits, and the first note is as it was.
    expect(screen.queryByRole("textbox", { name: "Add a note" })).toBeNull();
    expect(within(items()[0]).getByRole("button", { name: "Edit" })).toBeInTheDocument();
    await userEvent.clear(field);
    await userEvent.type(field, "Changed.");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(items().map((item) => item.querySelector(".note-text")?.textContent)).toEqual(["The first note.", "Changed."]);
    expect(sent(fetch)).toEqual([["PUT /api/me/notes/n2", JSON.stringify({ text: "Changed." })]]);
    expect(track.mock.calls).toEqual([["note_saved", { paper_id: "1", kind: "change" }]]);
    expect(screen.getByRole("textbox", { name: "Add a note" })).toBeInTheDocument();
  });

  it("Cancel keeps the note as it was, with no call", async () => {
    const { fetch } = await open();
    await userEvent.click(within(items()[0]).getByRole("button", { name: "Edit" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Your note" }), " More.");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(items()[0]).toHaveTextContent("The first note.");
    expect(sent(fetch)).toEqual([]);
  });

  it("moves to another note: one note at a time", async () => {
    await open();
    await userEvent.click(within(items()[0]).getByRole("button", { name: "Edit" }));
    await userEvent.click(within(items()[1]).getByRole("button", { name: "Delete" }));
    expect(screen.queryByRole("textbox", { name: "Your note" })).toBeNull();
    expect(within(items()[1]).getByRole("group", { name: "Delete this note?" })).toBeInTheDocument();
  });

  it("says that a note is gone, and removes it", async () => {
    await open(() => Response.json({ ok: false, why: "gone" }));
    await userEvent.click(within(items()[0]).getByRole("button", { name: "Edit" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("alert")).toHaveTextContent("This note is gone.");
    expect(items()).toHaveLength(1);
  });
});

describe("Delete", () => {
  it("asks one time, and Keep keeps the note", async () => {
    const { fetch } = await open();
    await userEvent.click(within(items()[0]).getByRole("button", { name: "Delete" }));
    const ask = within(items()[0]).getByRole("group", { name: "Delete this note?" });
    await userEvent.click(within(ask).getByRole("button", { name: "Keep" }));
    expect(items()).toHaveLength(2);
    expect(sent(fetch)).toEqual([]);
  });

  it("removes the note after the answer", async () => {
    const { fetch } = await open();
    await userEvent.click(within(items()[0]).getByRole("button", { name: "Delete" }));
    await userEvent.click(within(items()[0]).getByRole("button", { name: "Delete" }));
    expect(items().map((item) => item.querySelector(".note-text")?.textContent)).toEqual(["The second note."]);
    expect(sent(fetch)).toEqual([["DELETE /api/me/notes/n1", undefined]]);
    expect(track.mock.calls).toEqual([["note_deleted", { paper_id: "1" }]]);
  });

  it("keeps the note and says so when the delete fails", async () => {
    await open(() => new Response("", { status: 503 }));
    await userEvent.click(within(items()[0]).getByRole("button", { name: "Delete" }));
    await userEvent.click(within(items()[0]).getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("alert")).toHaveTextContent("The note is still here. Try again.");
    expect(items()).toHaveLength(2);
  });
});

describe("the notes while they load", () => {
  it("offers Try again when the load failed, and the field still works", async () => {
    let n = 0;
    await open(undefined, NOTES, () => (++n === 1 ? new Response("", { status: 503 }) : Response.json({ bookmarks: [], notes: NOTES })));
    expect(screen.getByRole("alert")).toHaveTextContent("Your notes did not load.");
    expect(screen.getByRole("textbox", { name: "Add a note" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(items()).toHaveLength(2);
  });

  it("puts the reader in the field when the paragraph has no note", async () => {
    await open(undefined, []);
    expect(screen.getByRole("textbox", { name: "Add a note" })).toHaveFocus();
  });
});
