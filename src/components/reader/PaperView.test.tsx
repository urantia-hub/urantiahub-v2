import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PaperDoc } from "@/content/fetchers";
import { PaperView } from "./PaperView";

const paper: PaperDoc = {
  id: "1",
  title: "The Universal Father",
  partId: "1",
  sections: [
    { id: "0", title: null, paragraphs: [{ ref: "1:0.1", text: "First.", html: '<span class="urantia-dev-pb-0">First.</span>', audio: null }] },
    { id: "1", title: "The Father’s Name", paragraphs: [{ ref: "1:1.1", text: "Second.", html: "<em>Second.</em>", audio: null }] },
  ],
};

describe("PaperView", () => {
  it("shows the part, the paper number, and the title", () => {
    render(<PaperView paper={paper} />);
    expect(screen.getByText("Part I · Paper 1")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "The Universal Father" })).toHaveAttribute("id", "paper-top");
  });

  it("gives each paragraph its reference as its id", () => {
    const { container } = render(<PaperView paper={paper} />);
    expect(container.querySelector('[id="1:0.1"]')).toHaveTextContent("First.");
    expect(container.querySelector('[id="1:1.1"]')).toHaveTextContent("Second.");
  });

  it("gives each section heading the id {paper}:{section}, and no heading for section 0", () => {
    const { container } = render(<PaperView paper={paper} />);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveAttribute("id", "1:1");
    expect(heading).toHaveTextContent("1. The Father’s Name");
    expect(container.querySelector('[id="1:0"]')).toBeNull();
  });

  it("renders the paragraph HTML", () => {
    const { container } = render(<PaperView paper={paper} />);
    expect(container.querySelector('[id="1:1.1"] em')).toHaveTextContent("Second.");
  });

  it("links to the previous and the next paper", () => {
    render(<PaperView paper={paper} />);
    expect(screen.getByRole("link", { name: /Previous.*Foreword/ })).toHaveAttribute("href", "/papers/foreword");
    expect(screen.getByRole("link", { name: /Next.*The Nature of God/ })).toHaveAttribute(
      "href",
      "/papers/paper-2-the-nature-of-god",
    );
  });

  it("shows no previous link on the Foreword and no next link on Paper 196", () => {
    const { rerender } = render(<PaperView paper={{ ...paper, id: "0", title: "Foreword", partId: "0" }} />);
    expect(screen.queryByRole("link", { name: /Previous/ })).toBeNull();
    expect(screen.getByText("Foreword", { selector: "h1" })).toBeInTheDocument();
    rerender(<PaperView paper={{ ...paper, id: "196", title: "The Faith of Jesus", partId: "4" }} />);
    expect(screen.queryByRole("link", { name: /Next/ })).toBeNull();
  });

  it("adds no number to a section title that has its own", () => {
    const foreword: PaperDoc = {
      id: "0",
      title: "Foreword",
      partId: "0",
      sections: [
        { id: "0", title: null, paragraphs: [{ ref: "0:0.1", text: "a", html: "a", audio: null }] },
        { id: "1", title: "I. Deity and Divinity", paragraphs: [{ ref: "0:1.1", text: "b", html: "b", audio: null }] },
      ],
    };
    render(<PaperView paper={foreword} />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(/^I\. Deity and Divinity$/);
  });
});
