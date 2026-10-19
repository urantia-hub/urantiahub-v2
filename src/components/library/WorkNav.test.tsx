import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DHAMMAPADA, dhammapadaPage2, dhammapadaPages } from "./library-fixtures";
import { WorkNav } from "./WorkNav";
import { WorkView } from "./WorkView";

vi.mock("@/analytics", () => ({ track: vi.fn() }));

const pages = dhammapadaPages();
function page() {
  return render(
    <>
      <WorkView work={DHAMMAPADA} page={pages[1]} pages={pages} passages={dhammapadaPage2()} />
      <WorkNav work={{ slug: "dhammapada", title: "The Dhammapada", short: "Dhammapada", summary: DHAMMAPADA.summary }} pages={pages.map((p) => ({ key: p.key, number: String(p.division), title: p.title as string, count: `${p.count} verses` }))} current="2" title="On Earnestness" />
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
  it("marks a passage on a press and opens its parallels; a second press closes them", async () => {
    page();
    const passage = document.getElementById("Dhp_21") as HTMLElement;
    await act(async () => fireEvent.click(passage));
    expect(passage).toHaveAttribute("data-picked");
    expect(await screen.findByRole("dialog", { name: "Parallels for Dhp 21" })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/parallels/library/dhammapada/Dhp%2021", expect.anything());
    await act(async () => fireEvent.click(passage));
    expect(passage).not.toHaveAttribute("data-picked");
  });

  it("opens the chapters from the middle of the dock, with the current one marked", async () => {
    page();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Dhammapada On Earnestness/ })));
    const sheet = screen.getByRole("dialog", { name: "Chapters" });
    const links = within(sheet).getAllByRole("link").filter((a) => a.getAttribute("href")?.startsWith("/library/dhammapada/"));
    expect(links).toHaveLength(26);
    expect(within(sheet).getByRole("link", { name: /On Earnestness/ })).toHaveAttribute("aria-current", "page");
    expect(within(sheet).getByRole("link", { name: "All the works in the Library" })).toHaveAttribute("href", "/library");
  });

  it("marks the passage that the address names, and opens its parallels", async () => {
    window.history.replaceState(null, "", "/library/dhammapada/2#Dhp_25");
    page();
    expect(await screen.findByRole("dialog", { name: "Parallels for Dhp 25" })).toBeInTheDocument();
    expect(document.getElementById("Dhp_25")).toHaveAttribute("data-picked");
  });
});
