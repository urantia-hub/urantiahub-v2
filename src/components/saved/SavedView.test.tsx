import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { markSignedOut, resetAccountForTest, startAccount } from "@/account/client";
import { resetSyncForTest } from "@/account/sync";
import { SavedView } from "./SavedView";

let query = "";
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(query) }));

const day = (n: number) => `2026-10-0${n}T00:00:00.000Z`;
const ENTRIES = [
  { ref: "1:0.3", paperId: "1", paperTitle: "The Universal Father", text: "The enlightened worlds all recognize the Universal Father.", savedAt: day(1), notes: [{ id: "n1", ref: "1:0.3", text: "Compare with Paper 10.", at: day(6) }] },
  { ref: "2:3.1", paperId: "2", paperTitle: "The Nature of God", text: "The actuality of the existence of God.", savedAt: day(4), notes: [] },
  { ref: "1:1.2", paperId: "1", paperTitle: "The Universal Father", text: "The Father's name.", savedAt: null, notes: [{ id: "n2", ref: "1:1.2", text: "Ask the group.", at: day(2) }] },
];
const clearCookies = () => {
  for (const part of document.cookie.split(";")) document.cookie = `${part.split("=")[0].trim()}=; max-age=0; path=/`;
};
type Answer = (url: string, init?: RequestInit) => Response | Promise<Response>;

async function show(load: Answer = () => Response.json({ entries: ENTRIES, cut: false }), write: Answer = () => Response.json({ ok: true })) {
  document.cookie = "hub_in=1; path=/";
  resetAccountForTest(true);
  const fetch = vi.fn(async (url: string, init?: RequestInit) => (url === "/api/auth/session" ? Response.json({ user: { name: "Ana", email: null, key: "k1" } }) : url === "/api/me/saved" ? load(url, init) : write(url, init)));
  vi.stubGlobal("fetch", fetch);
  await act(async () => {
    await startAccount();
  });
  await act(async () => {
    render(<SavedView />);
  });
  return fetch;
}
const refs = () => screen.getAllByRole("listitem").filter((li) => li.classList.contains("saved-entry")).map((li) => li.querySelector("small")!.textContent!.split("·")[0].trim());
const entryOf = (ref: string) => screen.getAllByRole("listitem").find((li) => li.classList.contains("saved-entry") && li.querySelector("small")!.textContent!.startsWith(ref))!;
const writes = (fetch: ReturnType<typeof vi.fn>) => fetch.mock.calls.filter(([url]) => /bookmarks|notes/.test(String(url))).map(([url, init]) => `${(init as RequestInit).method} ${url}`);

beforeEach(() => {
  query = "";
  clearCookies();
  resetSyncForTest();
});
afterEach(() => {
  vi.unstubAllGlobals();
  resetAccountForTest(false);
  clearCookies();
});

describe("the Saved page", () => {
  it("lists what the reader saved, the newest first, each with a link to its paragraph", async () => {
    await show();
    expect(screen.getByRole("heading", { name: "Saved" })).toBeInTheDocument();
    expect(refs()).toEqual(["1:0.3", "2:3.1", "1:1.2"]);
    expect(within(entryOf("1:0.3")).getByRole("link", { name: /enlightened worlds/ })).toHaveAttribute("href", "/papers/paper-1-the-universal-father#1:0.3");
    expect(entryOf("1:0.3")).toHaveTextContent("Compare with Paper 10.");
    // The list has no field for a new note.
    expect(screen.queryByRole("textbox", { name: "Add a note" })).toBeNull();
    // A paragraph with a note only is not a saved paragraph: it has no Remove.
    expect(within(entryOf("1:1.2")).queryByRole("button", { name: /^Remove/ })).toBeNull();
  });

  it("searches the notes, the text, the reference, and the paper, and says when nothing matches", async () => {
    await show();
    const field = screen.getByRole("searchbox", { name: "Search what you saved" });
    await userEvent.type(field, "group");
    expect(refs()).toEqual(["1:1.2"]);
    await userEvent.clear(field);
    await userEvent.type(field, "nature of god");
    expect(refs()).toEqual(["2:3.1"]);
    await userEvent.clear(field);
    await userEvent.type(field, "zebra");
    expect(screen.getByText("Nothing matches")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show all" }));
    expect(refs()).toHaveLength(3);
  });

  it("filters by kind", async () => {
    await show();
    await userEvent.click(screen.getByRole("button", { name: "Paragraphs" }));
    expect(refs()).toEqual(["1:0.3", "2:3.1"]);
    expect(screen.getByRole("button", { name: "Paragraphs" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "Notes" }));
    expect(refs()).toEqual(["1:0.3", "1:1.2"]);
  });

  it("sorts by paper, in the order of the text, under the name of each paper", async () => {
    await show();
    await userEvent.click(screen.getByRole("button", { name: /Newest first/ }));
    expect(refs()).toEqual(["1:0.3", "1:1.2", "2:3.1"]);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Paper 1 · The Universal Father", "Paper 2 · The Nature of God"]);
    expect(screen.getByRole("button", { name: /By paper/ })).toBeInTheDocument();
  });

  it("removes a saved paragraph: the entry goes, or stays with its notes", async () => {
    const fetch = await show();
    await userEvent.click(within(entryOf("2:3.1")).getByRole("button", { name: /^Remove/ }));
    expect(refs()).toEqual(["1:0.3", "1:1.2"]);
    await userEvent.click(within(entryOf("1:0.3")).getByRole("button", { name: /^Remove/ }));
    expect(refs()).toEqual(["1:0.3", "1:1.2"]);
    expect(within(entryOf("1:0.3")).queryByRole("img", { name: "Saved" })).toBeNull();
    expect(writes(fetch)).toEqual(["DELETE /api/me/bookmarks?ref=2%3A3.1", "DELETE /api/me/bookmarks?ref=1%3A0.3"]);
  });

  it("keeps the paragraph and says so when the removal fails", async () => {
    await show(undefined, () => new Response("", { status: 503 }));
    await userEvent.click(within(entryOf("2:3.1")).getByRole("button", { name: /^Remove/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("The paragraph is still saved. Try again.");
    expect(refs()).toHaveLength(3);
  });

  it("changes and deletes a note in the list, and an entry with nothing left goes", async () => {
    const fetch = await show(undefined, (_url, init) => (init?.method === "PUT" ? Response.json({ ok: true, note: { id: "n1", ref: "1:0.3", text: "Changed.", at: day(6) } }) : Response.json({ ok: true })));
    await userEvent.click(within(entryOf("1:0.3")).getByRole("button", { name: "Edit" }));
    await userEvent.clear(screen.getByRole("textbox", { name: "Your note" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Your note" }), "Changed.");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(entryOf("1:0.3")).toHaveTextContent("Changed.");
    await userEvent.click(within(entryOf("1:1.2")).getByRole("button", { name: "Delete" }));
    await userEvent.click(within(entryOf("1:1.2")).getByRole("button", { name: "Delete" }));
    expect(refs()).toEqual(["1:0.3", "2:3.1"]);
    expect(writes(fetch)).toEqual(["PUT /api/me/notes/n1", "DELETE /api/me/notes/n2"]);
  });

  it.each([
    ["nothing saved", () => Response.json({ entries: [], cut: false }), "Nothing saved yet"],
    ["a load with no answer", () => new Response("", { status: 503 }), "This did not load."],
  ])("says so for %s", async (_name, load, words) => {
    await show(load);
    expect(screen.getByText(words, { exact: false })).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).toBeNull();
  });

  it("loads again after Try again", async () => {
    let n = 0;
    await show(() => (++n === 1 ? new Response("", { status: 503 }) : Response.json({ entries: ENTRIES, cut: false })));
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refs()).toHaveLength(3);
  });

  it("says that a very long list is cut", async () => {
    await show(() => Response.json({ entries: ENTRIES, cut: true }));
    expect(screen.getByText("This list shows the first 2,000 of each kind.")).toBeInTheDocument();
  });

  it("shows grey rows while the list loads", async () => {
    await show(() => new Promise(() => {}));
    expect(screen.getByRole("status", { name: "Loading what you saved" })).toBeInTheDocument();
  });

  it("asks a reader with no account to sign in, and asks the server nothing", async () => {
    resetAccountForTest(true);
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await act(async () => startAccount());
    render(<SavedView />);
    expect(screen.getByText("Sign in to find them here.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps nothing of a reader on the page after a sign-out", async () => {
    await show();
    act(() => markSignedOut());
    expect(screen.queryByText("Compare with Paper 10.")).toBeNull();
    expect(screen.getByText("Sign in to find them here.")).toBeInTheDocument();
  });
});

describe("the page of one paragraph", () => {
  it("shows the whole paragraph, its notes, a field for a new one, and the ways back", async () => {
    query = "ref=1%3A0.3";
    const fetch = await show(undefined, () => Response.json({ ok: true, note: { id: "n9", ref: "1:0.3", text: "A new one.", at: day(9) } }));
    expect(screen.getByRole("heading", { name: "Your notes on 1:0.3" })).toBeInTheDocument();
    expect(screen.getByText("The enlightened worlds all recognize the Universal Father.")).not.toHaveClass("saved-text");
    expect(screen.getByRole("link", { name: "Paper 1" })).toHaveAttribute("href", "/papers/paper-1-the-universal-father#1:0.3");
    expect(screen.getByRole("link", { name: "All saved" })).toHaveAttribute("href", "/saved");
    expect(screen.queryByText("Ask the group.")).toBeNull();
    await userEvent.type(screen.getByRole("textbox", { name: "Add a note" }), "A new one.");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getAllByRole("listitem").map((li) => li.querySelector(".note-text")?.textContent)).toEqual(["Compare with Paper 10.", "A new one."]);
    expect(writes(fetch)).toEqual(["POST /api/me/notes"]);
  });

  it("says so for a paragraph with no note", async () => {
    query = "ref=5%3A1.1";
    await show();
    expect(screen.getByText("You have no notes on this paragraph.")).toBeInTheDocument();
  });
});
