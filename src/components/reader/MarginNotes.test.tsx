import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MarginNotes from "./MarginNotes";

const note = (id: string, ref: string, text: string, day: number) => ({ id, ref, text, at: `2026-10-0${day}T00:00:00.000Z` });
const LONG = "This note is long. ".repeat(12).trim();

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  document.body.innerHTML = '<article class="paper"><p class="para" id="1:0.3"></p><p class="para" id="1:0.5"></p></article>';
});
afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});
const card = (ref: string) => screen.getByRole("complementary", { name: `Your notes on ${ref}` });
const texts = (ref: string) => [...card(ref).querySelectorAll(".margin-text")].map((el) => el.textContent);

describe("the notes in the margin", () => {
  it("are one card for each paragraph, inside the paper, with the newest note", () => {
    render(<MarginNotes notes={[note("a", "1:0.3", "Older.", 1), note("b", "1:0.3", "Newer.", 5), note("c", "1:0.5", "Other.", 2)]} />);
    expect(document.querySelector(".paper .margin-notes")).not.toBeNull();
    expect(texts("1:0.3")).toEqual(["Newer."]);
    expect(texts("1:0.5")).toEqual(["Other."]);
    expect(within(card("1:0.5")).queryByRole("button", { name: /more note/ })).toBeNull();
  });

  it("open the other notes in their place, as a thread from the oldest", async () => {
    render(<MarginNotes notes={[note("a", "1:0.3", "First.", 1), note("b", "1:0.3", "Second.", 2), note("c", "1:0.3", "Third.", 3)]} />);
    await userEvent.click(within(card("1:0.3")).getByRole("button", { name: "2 more notes" }));
    expect(texts("1:0.3")).toEqual(["First.", "Second.", "Third."]);
    await userEvent.click(within(card("1:0.3")).getByRole("button", { name: "Show fewer" }));
    expect(texts("1:0.3")).toEqual(["Third."]);
  });

  it("say '1 more note' for two notes", () => {
    render(<MarginNotes notes={[note("a", "1:0.3", "First.", 1), note("b", "1:0.3", "Second.", 2)]} />);
    expect(within(card("1:0.3")).getByRole("button", { name: "1 more note" })).toBeInTheDocument();
  });

  it("send a long thread to the page of the paragraph, and do not open it in the margin", () => {
    render(<MarginNotes notes={Array.from({ length: 12 }, (_, i) => note(`n${i}`, "1:0.3", `Note ${i}.`, 1 + (i % 9)))} />);
    const all = within(card("1:0.3")).getByRole("link", { name: "See all 12 notes" });
    expect(all).toHaveAttribute("href", "/saved?ref=1%3A0.3");
    expect(within(card("1:0.3")).queryByRole("button", { name: /more notes$/ })).toBeNull();
    expect(texts("1:0.3")).toHaveLength(1);
  });

  it("cut a long note to three lines until Read more", async () => {
    render(<MarginNotes notes={[note("a", "1:0.3", LONG, 1), note("c", "1:0.5", "Short.", 2)]} />);
    const text = card("1:0.3").querySelector(".margin-text")!;
    expect(text).toHaveClass("clamp");
    await userEvent.click(within(card("1:0.3")).getByRole("button", { name: "Read more" }));
    expect(text).not.toHaveClass("clamp");
    expect(within(card("1:0.3")).getByRole("button", { name: "Show less" })).toBeInTheDocument();
    expect(within(card("1:0.5")).queryByRole("button", { name: "Read more" })).toBeNull();
  });

  it("name the paragraph on each note, so that a press opens Your notes", () => {
    render(<MarginNotes notes={[note("a", "1:0.3", "A note.", 1)]} />);
    expect(card("1:0.3").querySelector(".margin-text")).toHaveAttribute("data-notes-for", "1:0.3");
  });

  it("show markup characters as plain text", () => {
    render(<MarginNotes notes={[note("a", "1:0.3", "<b>bold</b> & <img src=x>", 1)]} />);
    expect(texts("1:0.3")).toEqual(["<b>bold</b> & <img src=x>"]);
    expect(card("1:0.3").querySelector("b, img")).toBeNull();
  });
});
