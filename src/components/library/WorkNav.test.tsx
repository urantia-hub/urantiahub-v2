import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DHAMMAPADA, dhammapadaPage2, dhammapadaPages } from "./library-fixtures";
import { readTextPlace } from "@/library/text-places";
import { WorkNav } from "./WorkNav";
import { WorkView } from "./WorkView";

vi.mock("@/analytics", () => ({ track: vi.fn() }));

const pages = dhammapadaPages();
function page() {
  return render(
    <>
      <WorkView work={DHAMMAPADA} page={pages[1]} pages={pages} passages={dhammapadaPage2()} />
      <WorkNav work={{ slug: "dhammapada", title: "The Dhammapada", short: "Dhammapada", summary: DHAMMAPADA.summary }} pages={pages.map((p) => ({ key: p.key, number: String(p.division), title: p.title as string, count: `${p.count} verses` }))} current="2" title="On Earnestness" label="Chapter 2" />
    </>,
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
  vi.stubGlobal("scrollTo", vi.fn());
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("WorkNav", () => {
  it("keeps this page as the reader's place in the work, for Continue on the page of the work", () => {
    window.localStorage.clear();
    page();
    expect(readTextPlace("dhammapada")).toMatchObject({ key: "2", title: "On Earnestness", label: "Chapter 2" });
  });

  it("marks a passage on a press and opens its parallels; a second press closes them", async () => {
    page();
    const passage = document.getElementById("Dhp_21") as HTMLElement;
    await act(async () => fireEvent.click(passage));
    expect(passage).toHaveAttribute("data-picked");
    expect(await screen.findByRole("dialog", { name: "Parallels for Dhp 21" })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/parallels/texts/dhammapada/Dhp%2021", expect.anything());
    await act(async () => fireEvent.click(passage));
    expect(passage).not.toHaveAttribute("data-picked");
  });

  it("opens the chapters from the middle of the dock, with the current one marked", async () => {
    page();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Dhammapada On Earnestness/ })));
    const sheet = screen.getByRole("dialog", { name: "Chapters" });
    const links = within(sheet).getAllByRole("link").filter((a) => a.getAttribute("href")?.startsWith("/texts/dhammapada/"));
    expect(links).toHaveLength(26);
    expect(within(sheet).getByRole("link", { name: /On Earnestness/ })).toHaveAttribute("aria-current", "page");
    expect(within(sheet).getByRole("link", { name: "About this work" })).toHaveAttribute("href", "/texts/dhammapada");
  });

  // The chapters have the frame of the parallels: a sheet on a phone, a card in the margin from 1100 px (mock, state 7).
  it("opens the chapters in the frame of the parallels, and Escape closes them", async () => {
    page();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Dhammapada On Earnestness/ })));
    const sheet = screen.getByRole("dialog", { name: "Chapters" });
    expect(sheet).toHaveClass("terms-sheet");
    expect(within(sheet).getByRole("heading", { level: 2, name: "The Dhammapada" })).toHaveClass("terms-title");
    await act(async () => fireEvent.keyDown(document, { key: "Escape" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Chapters" })).toBeNull());
  });

  it("marks the passage that the address names, and opens its parallels", async () => {
    window.history.replaceState(null, "", "/texts/dhammapada/2#Dhp_25");
    page();
    expect(await screen.findByRole("dialog", { name: "Parallels for Dhp 25" })).toBeInTheDocument();
    expect(document.getElementById("Dhp_25")).toHaveAttribute("data-picked");
  });
});

describe("WorkNav for the Bible", () => {
  const books = [
    { code: "John", name: "John", title: "The Gospel According to John", part: "New Testament", base: "john-", numbers: Array.from({ length: 21 }, (_, i) => i + 1) },
    { code: "Acts", name: "Acts", title: "The Acts of the Apostles", part: "New Testament", base: "acts-", numbers: Array.from({ length: 28 }, (_, i) => i + 1) },
  ];
  const bible = () =>
    render(
      <WorkNav
        work={{ slug: "bible", title: "The Bible (World English Bible)", short: "Bible", summary: "" }}
        pages={[]}
        books={{ rows: books, label: "The books of the Bible", unit: "chapter", current: { book: "John", chapter: 3 } }}
        previous={{ key: "john-2", title: "John 2" }}
        next={{ key: "john-4", title: "John 4" }}
        current="john-3"
        title="John 3"
      />,
    );

  it("opens the books from the middle of the dock, and goes to the next chapter by its arrow", async () => {
    bible();
    expect(screen.getByRole("link", { name: "Next: John 4" })).toHaveAttribute("href", "/texts/bible/john-4");
    expect(screen.getByRole("link", { name: "Previous: John 2" })).toHaveAttribute("href", "/texts/bible/john-2");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Bible John 3/ })));
    const sheet = screen.getByRole("dialog", { name: "The books of the Bible" });
    expect(within(sheet).getByRole("button", { name: "John 21 chapters" })).toHaveAttribute("aria-current", "true");
    expect(screen.queryByRole("dialog", { name: "Chapters" })).toBeNull();
  });
});
