import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DHAMMAPADA, dhammapadaPage2, dhammapadaPages } from "./library-fixtures";
import { WorkView } from "./WorkView";

describe("WorkView", () => {
  const pages = dhammapadaPages();

  it("shows the page of a work: its eyebrow, title, line, passages, and pager", () => {
    const { container } = render(<WorkView work={DHAMMAPADA} page={pages[1]} pages={pages} passages={dhammapadaPage2()} />);
    expect(screen.getByText("The Dhammapada · Chapter 2")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "On Earnestness" })).toBeInTheDocument();
    const meta = container.querySelector(".work-meta") as HTMLElement;
    expect(meta.textContent).toBe("F. Max Muller, 1881 · 12 verses · Read at the source");
    expect(within(meta).getByRole("link", { name: "Read at the source" })).toHaveAttribute("href", "https://www.gutenberg.org/cache/epub/2017/pg2017-images.html");
    const first = container.querySelector("#Dhp_21") as HTMLElement;
    expect(first).toHaveClass("para");
    expect(within(first).getByRole("link", { name: "21" })).toHaveAttribute("href", "#Dhp_21");
    expect(container.querySelectorAll("p.para")).toHaveLength(12);
    const pager = screen.getByRole("navigation", { name: "Pages" });
    expect(within(pager).getByRole("link", { name: /Previous/ })).toHaveAttribute("href", "/library/dhammapada/1");
    expect(within(pager).getByRole("link", { name: /Next/ })).toHaveAttribute("href", "/library/dhammapada/3");
  });

  it("shows no source link when the first passage has no address, and the Library after the last page", () => {
    const passages = dhammapadaPage2().map((p) => ({ ...p, url: null }));
    const { container } = render(<WorkView work={DHAMMAPADA} page={pages[25]} pages={pages} passages={passages} />);
    expect((container.querySelector(".work-meta") as HTMLElement).textContent).toBe("F. Max Muller, 1881 · 12 verses");
    const pager = screen.getByRole("navigation", { name: "Pages" });
    expect(within(pager).getByRole("link", { name: /All the works/ })).toHaveAttribute("href", "/library");
  });

  it("keeps a passage as plain text", () => {
    const passages = [{ ref: "Dhp 21", number: "21", text: "<b>bold</b>", url: null }];
    const { container } = render(<WorkView work={DHAMMAPADA} page={pages[1]} pages={pages} passages={passages} />);
    expect(container.querySelector("#Dhp_21 .text")?.textContent).toBe("<b>bold</b>");
    expect(container.querySelector("#Dhp_21 b")).toBeNull();
  });
});
