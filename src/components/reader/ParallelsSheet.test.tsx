import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Parallel, ParallelsAnswer } from "@/server/parallels";
import ParallelsSheet from "./ParallelsSheet";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/analytics", () => ({ track }));

const LONG = "A long passage of another work. ".repeat(12).trim();
const outside = (ref: string, percent: number, more: Partial<Parallel> = {}): Parallel => ({ ref, source: "World English Bible", text: `Text of ${ref}.`, percent, href: `https://ebible.org/eng-web/${ref}`, ...more });
const ANSWER: ParallelsAnswer = {
  outside: [outside("Bhagavad Gita 7.22-24", 46, { source: "Besant, 1922", text: LONG, href: "https://en.wikisource.org/wiki/x#:~:text=He" }), outside("Tobit 13:4", 42), outside("Sirach 18:1", 41, { href: null })],
  papers: [{ ref: "56:9.10", source: "Universal Unity", text: "And God the Father is the personal source.", percent: 73, href: "/papers/paper-56-universal-unity#56:9.10" }],
};
const fetchMock = vi.fn();
const answers = (body: unknown, status = 200) => fetchMock.mockImplementation(async () => Response.json(body, { status }));
const onClose = vi.fn();
const open = () => render(<ParallelsSheet reference="1:0.3" paperId="1" onClose={onClose} />);
const sheet = () => screen.getByRole("dialog", { name: "Parallels for 1:0.3" });
const refs = () => within(sheet()).queryAllByRole("listitem").map((li) => li.querySelector("b")?.textContent);
const tab = (name: string) => within(sheet()).getByRole("button", { name });

beforeEach(() => {
  track.mockClear();
  onClose.mockClear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("the parallels of a paragraph", () => {
  it("asks for the paragraph, and opens on the other works, the nearest first, each with its number", async () => {
    answers(ANSWER);
    open();
    expect(await within(sheet()).findByText("Tobit 13:4")).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/parallels/1%3A0.3");
    expect(tab("Other works")).toHaveAttribute("aria-pressed", "true");
    expect(refs()).toEqual(["Bhagavad Gita 7.22-24", "Tobit 13:4", "Sirach 18:1"]);
    const first = within(sheet()).getAllByRole("listitem")[0];
    expect(first).toHaveTextContent("Besant, 1922");
    expect(first).toHaveTextContent("46%");
    expect(sheet()).toHaveTextContent("A parallel is not a source.");
  });

  it("shows the passages of the Papers in the other half", async () => {
    answers(ANSWER);
    open();
    await within(sheet()).findByText("Tobit 13:4");
    await userEvent.click(tab("In the Papers"));
    expect(refs()).toEqual(["56:9.10"]);
    expect(tab("In the Papers")).toHaveAttribute("aria-pressed", "true");
    expect(within(sheet()).getByRole("listitem")).toHaveTextContent("Universal Unity");
    expect(track).toHaveBeenCalledWith("parallels_tab", { tab: "papers" });
  });

  it("opens another work in a new tab, and a paragraph of the Papers on this site, with one word for both", async () => {
    answers(ANSWER);
    open();
    await within(sheet()).findByText("Tobit 13:4");
    const items = within(sheet()).getAllByRole("listitem");
    const out = within(items[0]).getByRole("link", { name: /^Open/ });
    expect(out).toHaveAttribute("href", "https://en.wikisource.org/wiki/x#:~:text=He");
    expect(out).toHaveAttribute("target", "_blank");
    expect(out.getAttribute("rel")).toContain("noopener");
    // A passage with no page that is sure has no link.
    expect(within(items[2]).queryByRole("link")).toBeNull();
    await userEvent.click(tab("In the Papers"));
    const inside = within(sheet()).getByRole("link", { name: /^Open/ });
    expect(inside).toHaveAttribute("href", "/papers/paper-56-universal-unity#56:9.10");
    expect(inside).not.toHaveAttribute("target");
  });

  it("cuts a long passage until Read more", async () => {
    answers(ANSWER);
    open();
    await within(sheet()).findByText("Tobit 13:4");
    const items = within(sheet()).getAllByRole("listitem");
    expect(items[0].querySelector("p")).toHaveClass("clamp");
    await userEvent.click(within(items[0]).getByRole("button", { name: "Read more" }));
    expect(items[0].querySelector("p")).not.toHaveClass("clamp");
    expect(within(items[1]).queryByRole("button", { name: "Read more" })).toBeNull();
  });

  it("shows the first eight passages, and the others after Show more", async () => {
    answers({ outside: Array.from({ length: 13 }, (_, i) => outside(`John ${i + 1}:1`, 60 - i)), papers: [] });
    open();
    await within(sheet()).findByText("John 1:1");
    expect(refs()).toHaveLength(8);
    await userEvent.click(within(sheet()).getByRole("button", { name: "Show 5 more" }));
    expect(refs()).toHaveLength(13);
  });

  it("says so when a half has no near passage", async () => {
    answers({ outside: [], papers: ANSWER.papers });
    open();
    expect(await within(sheet()).findByText("No near passage was found in other works.")).toBeInTheDocument();
    await userEvent.click(tab("In the Papers"));
    expect(refs()).toEqual(["56:9.10"]);
  });

  it("offers Try again when the list does not load", async () => {
    answers({ error: "down" }, 502);
    open();
    expect(await within(sheet()).findByRole("alert")).toHaveTextContent("The parallels did not load.");
    answers(ANSWER);
    await userEvent.click(within(sheet()).getByRole("button", { name: "Try again" }));
    expect(await within(sheet()).findByText("Tobit 13:4")).toBeInTheDocument();
  });

  it("closes on Escape and on its button", async () => {
    answers(ANSWER);
    open();
    await within(sheet()).findByText("Tobit 13:4");
    await userEvent.keyboard("{Escape}");
    await userEvent.click(within(sheet()).getByRole("button", { name: "Close the parallels" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("counts an opened list and an opened passage, with no reference and no text", async () => {
    answers(ANSWER);
    open();
    await within(sheet()).findByText("Tobit 13:4");
    expect(track).toHaveBeenCalledWith("parallels_opened", { paper_id: "1", outside: "1-5", papers: "1-5" });
    await userEvent.click(within(within(sheet()).getAllByRole("listitem")[1]).getByRole("link", { name: /^Open/ }));
    expect(track).toHaveBeenCalledWith("parallel_opened", { kind: "outside" });
  });
});
