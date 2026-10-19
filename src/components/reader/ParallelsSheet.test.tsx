import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Parallel, ParallelsAnswer } from "@/server/parallels";
import ParallelsSheet from "./ParallelsSheet";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/analytics", () => ({ track }));

const LONG = "A long passage of another work. ".repeat(12).trim();
const outside = (ref: string, percent: number, more: Partial<Parallel> = {}): Parallel => ({ ref, work: "Bible", source: "World English Bible", text: `Text of ${ref}.`, percent, href: `https://ebible.org/eng-web/${ref}`, ...more });
const ANSWER: ParallelsAnswer = {
  text: "The paragraph.",
  outside: [outside("Bhagavad Gita 7.22-24", 46, { source: "Besant, 1922", text: LONG, href: "https://en.wikisource.org/wiki/x#:~:text=He" }), outside("Tobit 13:4", 42), outside("Sirach 18:1", 41, { href: null })],
  weaker: [],
  works: [],
  papers: [{ ref: "56:9.10", work: "The Urantia Papers", source: "Universal Unity", text: "And God the Father is the personal source.", percent: 73, href: "/papers/paper-56-universal-unity#56:9.10" }],
  nearby: [{ ref: "1:0.1", work: "The Urantia Papers", source: "The Universal Father", text: "THE Universal Father is the God of all creation.", percent: 72, href: "/papers/paper-1-the-universal-father#1:0.1" }],
};
const fetchMock = vi.fn();
const answers = (body: unknown, status = 200) => fetchMock.mockImplementation(async () => Response.json(body, { status }));
const onClose = vi.fn();
const onGo = vi.fn();
const open = () => render(<ParallelsSheet reference="1:0.3" paperId="1" onClose={onClose} onGo={onGo} />);
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
    expect(sheet()).not.toHaveTextContent("came from the other");
    expect(within(sheet()).getByRole("link", { name: "Study these parallels" })).toHaveAttribute("href", "/parallels?ref=1%3A0.3");
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

  // A link to the same page with another "#" sends no event that the controls of the paper hear.
  it("tells the controls of the paper which paragraph a passage of the Papers opens", async () => {
    answers({ outside: [], papers: [{ ref: "1:0.1", work: "The Urantia Papers", source: "The Universal Father", text: "THE Universal Father.", percent: 72, href: "/papers/paper-1-the-universal-father#1:0.1" }] });
    open();
    await userEvent.click(await within(sheet()).findByRole("button", { name: "In the Papers" }));
    within(sheet()).getByRole("link", { name: /^Open/ }).addEventListener("click", (event) => event.preventDefault());
    await userEvent.click(within(sheet()).getByRole("link", { name: /^Open/ }));
    expect(onGo).toHaveBeenCalledWith("1:0.1");
  });

  it("says what the number is when the reader presses it, and hides that on a second press", async () => {
    answers(ANSWER);
    open();
    await within(sheet()).findByText("Tobit 13:4");
    const number = within(sheet()).getByRole("button", { name: "46% near in meaning. What is this number?" });
    expect(number).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(number);
    expect(number).toHaveAttribute("aria-expanded", "true");
    expect(within(sheet()).getAllByRole("listitem")[0]).toHaveTextContent("How near in meaning this passage is to the paragraph. A computer measures it.");
    await userEvent.click(number);
    expect(number).toHaveAttribute("aria-expanded", "false");
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

  it("lists other parts of the Papers first, and the passages of this paper and the papers beside it on a press", async () => {
    answers(ANSWER);
    open();
    await within(sheet()).findByText("Tobit 13:4");
    await userEvent.click(tab("In the Papers"));
    expect(within(sheet()).getByText("Elsewhere in the Papers")).toBeInTheDocument();
    expect(refs()).toEqual(["56:9.10"]);
    await userEvent.click(within(sheet()).getByRole("button", { name: "Show 1 nearby passage" }));
    expect(refs()).toEqual(["56:9.10", "1:0.1"]);
    expect(within(sheet()).getByText("In Paper 1 and the papers beside it.")).toBeInTheDocument();
    expect(within(sheet()).queryByRole("button", { name: /nearby/ })).toBeNull();
    expect(track).toHaveBeenCalledWith("parallels_nearby_shown", { paper_id: "1" });
    // The other half closes the list again.
    await userEvent.click(tab("Other works"));
    await userEvent.click(tab("In the Papers"));
    expect(refs()).toEqual(["56:9.10"]);
  });

  it("says that no passage is in other parts of the Papers when each one is nearby", async () => {
    answers({ ...ANSWER, papers: [] });
    open();
    await within(sheet()).findByText("Tobit 13:4");
    await userEvent.click(tab("In the Papers"));
    expect(within(sheet()).getByText("No near passage was found in other parts of the Papers.")).toBeInTheDocument();
    expect(within(sheet()).getByRole("button", { name: "Show 1 nearby passage" })).toBeInTheDocument();
  });

  // The Hub keeps an answer for weeks, so an answer from before the change can arrive.
  it("shows an answer with no nearby list as one list, as before", async () => {
    answers({ ...ANSWER, nearby: undefined });
    open();
    await within(sheet()).findByText("Tobit 13:4");
    await userEvent.click(tab("In the Papers"));
    expect(refs()).toEqual(["56:9.10"]);
    expect(within(sheet()).queryByText("Elsewhere in the Papers")).toBeNull();
    expect(within(sheet()).queryByRole("button", { name: /nearby/ })).toBeNull();
  });

  it("offers the passages below the floor when no passage is near, and shows them on a press", async () => {
    answers({ outside: [], weaker: [outside("Hebrews 1:14", 36)], papers: [] });
    open();
    expect(await within(sheet()).findByText("No near passage was found in other works.")).toBeInTheDocument();
    expect(refs()).toEqual([]);
    await userEvent.click(within(sheet()).getByRole("button", { name: "See passages that are likely not related" }));
    expect(refs()).toEqual(["Hebrews 1:14"]);
    expect(within(sheet()).queryByRole("button", { name: "See passages that are likely not related" })).toBeNull();
    expect(track).toHaveBeenCalledWith("parallels_weaker_shown", { paper_id: "1" });
    // The Papers have no such list.
    await userEvent.click(tab("In the Papers"));
    expect(within(sheet()).queryByRole("button", { name: "See passages that are likely not related" })).toBeNull();
  });

  it("makes no such offer when a passage is near, or when none is below the floor", async () => {
    answers({ ...ANSWER, weaker: [outside("Hebrews 1:14", 36)] });
    open();
    await within(sheet()).findByText("Tobit 13:4");
    expect(within(sheet()).queryByRole("button", { name: "See passages that are likely not related" })).toBeNull();
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
    expect(track).toHaveBeenCalledWith("parallels_opened", { paper_id: "1", outside: "1-5", papers: "1-5", nearby: "1-5" });
    await userEvent.click(within(within(sheet()).getAllByRole("listitem")[1]).getByRole("link", { name: /^Open/ }));
    expect(track).toHaveBeenCalledWith("parallel_opened", { kind: "outside" });
  });
});

describe("the parallels of a passage of the Library", () => {
  const PASSAGE = {
    ...ANSWER,
    text: "",
    label: "Dhammapada 21-23",
    nearby: [],
    weakerPapers: [],
    outside: [outside("Psalms 1:1-2", 52, { library: null }), outside("Koran 2.255-257", 50, { work: "Koran", source: "Pickthall, 1930", library: { slug: "quran", ref: "Quran 2.255-257" } })],
  };
  const openPassage = () => render(<ParallelsSheet reference="Dhp 21" paperId="" work="dhammapada" onClose={onClose} />);
  const passageSheet = () => screen.getByRole("dialog", { name: /^Parallels for/ });

  it("asks the address of the passage, opens on the Papers, names the chunk, and has no study page", async () => {
    answers(PASSAGE);
    openPassage();
    expect(await within(passageSheet()).findByText("56:9.10", { selector: "b" })).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/parallels/library/dhammapada/Dhp%2021");
    const halves = within(passageSheet()).getAllByRole("button", { pressed: undefined }).filter((b) => b.hasAttribute("aria-pressed"));
    expect(halves.map((b) => b.textContent)).toEqual(["In the Papers", "Other works"]);
    expect(halves[0]).toHaveAttribute("aria-pressed", "true");
    expect(within(passageSheet()).getByRole("heading", { name: "Parallels for Dhammapada 21-23" })).toBeInTheDocument();
    expect(within(passageSheet()).queryByRole("link", { name: "Study these parallels" })).toBeNull();
    expect(track).toHaveBeenCalledWith("parallels_opened", expect.objectContaining({ source: "passage" }));
  });

  it("shows the Papers as a plain heading when no other work is near", async () => {
    answers({ ...PASSAGE, outside: [], weaker: [] });
    openPassage();
    await within(passageSheet()).findByText("56:9.10", { selector: "b" });
    expect(within(passageSheet()).queryByRole("button", { name: "Other works" })).toBeNull();
    expect(within(passageSheet()).getByText("In the Papers", { selector: ".terms-group" })).toBeInTheDocument();
  });

  it("offers the Papers below the floor when none is at the floor", async () => {
    answers({ ...PASSAGE, papers: [], weakerPapers: [{ ...ANSWER.papers[0], ref: "131:8.2", percent: 44 }] });
    openPassage();
    await userEvent.click(await within(passageSheet()).findByRole("button", { name: "See passages that are likely not related" }));
    expect(within(passageSheet()).getByText("131:8.2", { selector: "b" })).toBeInTheDocument();
  });

  it("keeps the other works without a link to the Library while the Library is unlinked", async () => {
    answers(PASSAGE);
    openPassage();
    await within(passageSheet()).findByText("56:9.10", { selector: "b" });
    await userEvent.click(within(passageSheet()).getByRole("button", { name: "Other works" }));
    expect(within(passageSheet()).getByText("Koran 2.255-257", { selector: "b" })).toBeInTheDocument();
    expect(within(passageSheet()).queryByRole("link", { name: /In the Library/ })).toBeNull();
  });
});
