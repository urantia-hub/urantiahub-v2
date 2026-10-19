import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChaptersSheet } from "./ChaptersSheet";

const work = { slug: "quran", title: "The Meaning of the Glorious Koran", summary: "" };
const pages = Array.from({ length: 114 }, (_, i) => ({ key: String(i + 1), number: String(i + 1), title: `Surah ${i + 1}`, count: "7 verses" }));

describe("ChaptersSheet as a grid", () => {
  it("shows each page as its number, named in full for a screen reader, the current one marked", async () => {
    const onClose = vi.fn();
    render(<ChaptersSheet work={work} pages={pages} current="2" grid onClose={onClose} />);
    const sheet = screen.getByRole("dialog", { name: "Chapters" });
    expect(sheet.querySelector(".chapter-grid")).not.toBeNull();
    expect(sheet.querySelector(".chapter-list")).toBeNull();
    const two = within(sheet).getByRole("link", { name: "Surah 2" });
    expect(two).toHaveTextContent(/^2$/);
    expect(two).toHaveAttribute("aria-current", "page");
    expect(within(sheet).getByRole("link", { name: "Surah 114" })).toHaveAttribute("href", "/texts/quran/114");
    expect(within(sheet).getByRole("link", { name: "About this work" })).toHaveAttribute("href", "/texts/quran");
    await act(async () => fireEvent.keyDown(document, { key: "Escape" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("keeps the list of titles when it is not a grid", () => {
    render(<ChaptersSheet work={work} pages={pages.slice(0, 3)} current="2" onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Chapters" }).querySelector(".chapter-list")).not.toBeNull();
  });
});
