import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PaperDoc } from "@/content/fetchers";
import { PaperView } from "./PaperView";

const paper: PaperDoc = {
  id: "1",
  title: "The Universal Father",
  voice: null,
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

  it("links to the previous paper, and ends with the next paper to listen to or to read", () => {
    const { container } = render(<PaperView paper={paper} />);
    expect(screen.getByRole("link", { name: /Previous.*Foreword/ })).toHaveAttribute("href", "/papers/foreword");
    expect(container.querySelector(".paper-end-label")).toHaveTextContent("End of Paper 1");
    expect(container.querySelector(".up-next")).toHaveTextContent("Up nextPaper 2 · The Nature of God");
    expect(screen.getByRole("link", { name: "Listen" })).toHaveAttribute("href", "/papers/paper-2-the-nature-of-god?listen=1#paper-top");
    expect(screen.getByRole("link", { name: "Read" })).toHaveAttribute("href", "/papers/paper-2-the-nature-of-god");
  });

  it("names the Foreword at its end, and has no Listen in Spanish", () => {
    const { container, rerender } = render(<PaperView paper={{ ...paper, id: "0", title: "Foreword", partId: "0" }} />);
    expect(container.querySelector(".paper-end-label")).toHaveTextContent("End of the Foreword");
    rerender(<PaperView paper={paper} lang="es" />);
    expect(container.querySelector(".paper-end-label")).toHaveTextContent("Fin del Documento 1");
    expect(screen.queryByRole("link", { name: "Escuchar" })).toBeNull();
    expect(screen.getByRole("link", { name: "Leer" })).toBeInTheDocument();
  });

  it("shows no previous link on the Foreword and no next link on Paper 196", () => {
    const { rerender } = render(<PaperView paper={{ ...paper, id: "0", title: "Foreword", partId: "0" }} />);
    expect(screen.queryByRole("link", { name: /Previous/ })).toBeNull();
    expect(screen.getByText("Foreword", { selector: "h1" })).toBeInTheDocument();
    rerender(<PaperView paper={{ ...paper, id: "196", title: "The Faith of Jesus", partId: "4" }} />);
    expect(screen.queryByRole("link", { name: /Next/ })).toBeNull();
    expect(document.querySelector(".up-next")).toBeNull();
  });

  it("adds no number to a section title that has its own", () => {
    const foreword: PaperDoc = {
      id: "0",
      title: "Foreword",
      voice: null,
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
