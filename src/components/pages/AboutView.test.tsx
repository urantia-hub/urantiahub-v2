import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AboutView } from "./AboutView";

// The English page word for word, as it was before it had a twin.
const ENGLISH = [
  "About",
  "The Urantia Papers",
  "The Urantia Papers are 196 papers and a foreword, in four parts. They were first published in 1955 as The Urantia Book.",
  "The subjects are God and the universe, the history of this world, and the life and teachings of Jesus. The four parts are The Central and Superuniverses, The Local Universe, The History of Urantia, and The Life and Teachings of Jesus.",
  "Readers cite the Papers by paper, section, and paragraph. The reference 99:1.1 is Paper 99, section 1, paragraph 1.",
  "UrantiaHub",
  "UrantiaHub is a place to read the Papers. The full text is here, free to read, with no account. See all papers.",
  "Each paper has a narration. You can listen here, or listen on Spotify.",
  "UrantiaHub is an independent project. It is not affiliated with Urantia Foundation.",
  "The text",
  "The English text of the Papers is in the public domain in the United States (Michael Foundation v. Urantia Foundation, 10th Cir. 2003).",
  "The text on this site comes from urantia.dev, an open API for the Papers.",
];
const blocks = (container: HTMLElement) => [...container.querySelectorAll("h1, h2, p")].map((e) => e.textContent?.replace(/\s+/g, " ").trim());

describe("the About page", () => {
  it("is the English page word for word", () => {
    const { container } = render(<AboutView lang="en" />);
    expect(blocks(container)).toEqual(ENGLISH);
    expect(screen.getByRole("link", { name: "See all papers." })).toHaveAttribute("href", "/papers");
  });

  it("is Spanish on the Spanish page, with Spanish links and no English sentence", () => {
    const { container } = render(<AboutView lang="es" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Acerca de");
    expect(screen.getByRole("link", { name: /documentos/ })).toHaveAttribute("href", "/es/documentos");
    expect(screen.getByRole("link", { name: /Spotify/ })).toHaveAttribute("href", "https://open.spotify.com/show/7IDP6RsZbKtUjfEwLLHtuw");
    expect(screen.getByRole("link", { name: "urantia.dev" })).toHaveAttribute("href", "https://urantia.dev");
    const spanish = blocks(container);
    expect(spanish).toHaveLength(ENGLISH.length);
    for (const line of ENGLISH.filter((l) => l !== "UrantiaHub")) expect(spanish).not.toContain(line);
  });
});
