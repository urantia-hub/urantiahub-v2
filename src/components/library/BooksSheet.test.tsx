import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { bibleBooks, biblePages } from "@/library/bible";
import { workBooks } from "@/library/books";
import { BooksSheet } from "./BooksSheet";

const books = bibleBooks(biblePages(JSON.parse(readFileSync("e2e/fixtures/library/bible_books.json", "utf8")).data));
const work = { slug: "bible", title: "The Bible (World English Bible)", summary: "The Hebrew Bible, the deuterocanon, and the New Testament." };
const open = (onClose = vi.fn()) => {
  render(<BooksSheet work={work} books={books} label="The books of the Bible" unit="chapter" current={{ book: "John", chapter: 3 }} onClose={onClose} />);
  return { sheet: screen.getByRole("dialog", { name: "The books of the Bible" }), onClose };
};

describe("BooksSheet", () => {
  it("lists the books in their three parts, the current book marked, in the frame of the parallels", () => {
    const { sheet } = open();
    expect(sheet).toHaveClass("terms-sheet", "chapters");
    expect(within(sheet).getByRole("heading", { level: 2, name: "The Bible (World English Bible)" })).toHaveClass("terms-title");
    expect(within(sheet).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Old Testament", "Deuterocanon", "New Testament"]);
    expect(within(sheet).getAllByRole("button", { name: /chapters?$/ })).toHaveLength(81);
    expect(within(sheet).getByRole("button", { name: "John 21 chapters" })).toHaveAttribute("aria-current", "true");
    expect(within(sheet).getByRole("button", { name: "Obadiah 1 chapter" })).toBeInTheDocument();
    expect(within(sheet).getByRole("link", { name: "All world texts" })).toHaveAttribute("href", "/texts");
  });

  it("opens the chapters of a book as numbers, the current chapter marked, and goes back to all books", async () => {
    const { sheet } = open();
    await act(async () => fireEvent.click(within(sheet).getByRole("button", { name: "John 21 chapters" })));
    expect(within(sheet).getByRole("heading", { level: 2, name: "John" })).toBeInTheDocument();
    expect(within(sheet).getByText("The Gospel According to John")).toBeInTheDocument();
    const chapters = within(sheet).getAllByRole("link").filter((a) => a.getAttribute("href")?.startsWith("/texts/bible/john-"));
    expect(chapters).toHaveLength(21);
    expect(within(sheet).getByRole("link", { name: "3" })).toHaveAttribute("aria-current", "page");
    expect(within(sheet).getByRole("link", { name: "4" })).toHaveAttribute("href", "/texts/bible/john-4");
    expect(within(sheet).getByRole("button", { name: "All books" })).toHaveFocus();
    await act(async () => fireEvent.click(within(sheet).getByRole("button", { name: "All books" })));
    expect(within(sheet).getByRole("button", { name: "Genesis 50 chapters" })).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "John 21 chapters" })).toHaveFocus();
  });

  it("marks no chapter in another book, and Escape closes", async () => {
    const { sheet, onClose } = open();
    await act(async () => fireEvent.click(within(sheet).getByRole("button", { name: "Mark 16 chapters" })));
    expect(within(sheet).queryByRole("link", { current: "page" })).toBeNull();
    await act(async () => fireEvent.keyDown(document, { key: "Escape" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});

describe("BooksSheet for a work in books", () => {
  it("opens a book of the Rig Veda as the numbers of its hymns, with no parts and no lead line", async () => {
    const pages = JSON.parse(readFileSync("e2e/fixtures/library/scriptures_rig-veda.json", "utf8")).data.pages.map(
      (p: { division: number; subdivision: number; firstRef: string }) => ({ ...p, key: `${p.division}-${p.subdivision}`, title: null, lastRef: p.firstRef, count: 1 }),
    );
    const rows = workBooks({ refPrefix: "RV", divisionLabel: "book" }, pages);
    render(<BooksSheet work={{ slug: "rig-veda", title: "The Hymns of the Rigveda", summary: "" }} books={rows} label="Books" unit="hymn" current={{ book: "10", chapter: 129 }} onClose={vi.fn()} />);
    const sheet = screen.getByRole("dialog", { name: "Books" });
    expect(within(sheet).queryAllByRole("heading", { level: 3 })).toHaveLength(0);
    await act(async () => fireEvent.click(within(sheet).getByRole("button", { name: "Book 10 191 hymns" })));
    expect(within(sheet).getByRole("link", { name: "129" })).toHaveAttribute("aria-current", "page");
    expect(within(sheet).getByRole("link", { name: "1" })).toHaveAttribute("href", "/texts/rig-veda/10-1");
    expect(sheet.querySelectorAll(".parallel-lead")).toHaveLength(0);
  });
});
