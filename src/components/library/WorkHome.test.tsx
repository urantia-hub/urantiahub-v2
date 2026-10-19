import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { workContents, workFacts } from "@/library/contents";
import { DHAMMAPADA, dhammapadaPages, dhammapadaPairs } from "./library-fixtures";
import { WorkHome } from "./WorkHome";

const pages = dhammapadaPages();
const contents = workContents(DHAMMAPADA, pages);
const source = "https://www.gutenberg.org/cache/epub/2017/pg2017-images.html";
const home = (over: Partial<Parameters<typeof WorkHome>[0]> = {}) =>
  render(<WorkHome work={DHAMMAPADA} facts={workFacts(DHAMMAPADA, contents)} source={source} start="/texts/dhammapada/1" contents={contents} pairs={dhammapadaPairs()} {...over} />);

describe("WorkHome", () => {
  it("shows what the work is, and the way into its text", () => {
    const { container } = home();
    expect(screen.getByText("Buddhist · Scripture")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "The Dhammapada" })).toBeInTheDocument();
    expect(screen.getByText(DHAMMAPADA.summary)).toHaveClass("work-summary");
    expect((container.querySelector(".work-meta") as HTMLElement).textContent).toBe("F. Max Muller, 1881 · 26 chapters · 414 verses · Read at the source");
    expect(screen.getByRole("link", { name: "Start reading" })).toHaveAttribute("href", "/texts/dhammapada/1");
  });

  it("lists each chapter with its verses, each a link to its page", () => {
    home();
    const list = screen.getByRole("heading", { name: "Contents" }).closest("section") as HTMLElement;
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(26);
    expect(within(rows[1]).getByRole("link", { name: "On Earnestness" })).toHaveAttribute("href", "/texts/dhammapada/2");
    expect(rows[1].textContent).toContain("Verses 21–32");
  });

  it("shows the pairs nearest to the Papers, each half a link to its text", () => {
    home();
    const block = screen.getByRole("heading", { name: "Nearest to the Papers" }).closest("section") as HTMLElement;
    const pairs = within(block).getAllByRole("listitem");
    expect(pairs).toHaveLength(3);
    const [work, paper] = within(pairs[0]).getAllByRole("link");
    expect(work).toHaveAttribute("href", "/texts/dhammapada/at/Dhp%2021-23");
    expect(work.textContent).toContain("63%");
    expect(paper.getAttribute("href")).toBe("/papers/paper-131-the-worlds-religions#131:3.7");
  });

  it("links the section of Paper 131 on the tradition, and names the edition", () => {
    home();
    const link = screen.getByRole("link", { name: /In the Papers/ });
    expect(link.textContent).toContain("131:3 Buddhism, in The World’s Religions");
    expect(link.getAttribute("href")).toBe("/papers/paper-131-the-worlds-religions#131:3");
    const facts = screen.getByRole("heading", { name: "This edition" }).closest("section") as HTMLElement;
    expect(facts.textContent).toContain("Public domain in the United States");
    expect(within(facts).getByRole("link", { name: "Read at the source" })).toHaveAttribute("href", source);
  });

  it("leaves out the pairs and the section when the work has none", () => {
    home({ pairs: [], work: { ...DHAMMAPADA, urantiaSection: null } });
    expect(screen.queryByRole("heading", { name: "Nearest to the Papers" })).toBeNull();
    expect(screen.queryByRole("link", { name: /In the Papers/ })).toBeNull();
  });
});
