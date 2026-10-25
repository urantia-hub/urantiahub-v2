import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { paperPath } from "@/content/paper-index";
import { StudyView } from "./StudyView";

let given = "1:0.3";
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(given ? `ref=${given}` : "") }));
vi.mock("@/analytics", () => ({ track: vi.fn() }));

const ANSWER = {
  text: "Texto del párrafo.",
  outside: [{ ref: "John 3:16", work: "Bible", source: "World English Bible", text: "For God so loved the world.", percent: 55, href: null, english: true }],
  weaker: [],
  papers: [{ ref: "2:1.1", work: "Los Documentos de Urantia", source: "La naturaleza de Dios", text: "Texto del documento 2.", percent: 64, href: `${paperPath("2", "es")}#2:1.1` }],
  nearby: [],
  works: [
    { work: "Los Documentos de Urantia", source: "", href: "/es/documentos" },
    { work: "Bible", source: "World English Bible", href: "https://ebible.org/eng-web/" },
  ],
};
const asked: string[] = [];
const answer = (body: object) => vi.stubGlobal("fetch", vi.fn(async (url: string) => (asked.push(url), Response.json(body))));
afterEach(() => {
  vi.unstubAllGlobals();
  asked.length = 0;
  given = "1:0.3";
});

describe("the study page in Spanish", () => {
  it("asks for the Spanish parallels and speaks Spanish, with the other works marked English", async () => {
    answer(ANSWER);
    const { container } = render(<StudyView lang="es" />);
    expect(await screen.findByText("Texto del párrafo.")).toBeInTheDocument();
    expect(asked).toEqual(["/api/parallels/1%3A0.3?lang=es"]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Paralelos de 1:0.3");
    expect(screen.getByText("Todas las obras")).toBeInTheDocument();
    expect(screen.getByText(/y más$/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Documento 1/ })).toHaveAttribute("href", `${paperPath("1", "es")}#1:0.3`);
    expect(screen.getByRole("link", { name: /Abrir\s*2:1.1/ })).toHaveAttribute("href", `${paperPath("2", "es")}#2:1.1`);
    // The Papers count as a work of their own, with their passage.
    const papers = [...container.querySelectorAll(".study-works .work")].find((w) => w.textContent?.startsWith("Los Documentos de Urantia"));
    expect(papers).not.toHaveClass("none");
    expect(papers?.querySelector("b")).toHaveTextContent("1");
    const bible = screen.getByText("For God so loved the world.");
    expect(bible).toHaveAttribute("lang", "en");
    expect(bible.closest("li")).toHaveTextContent("en inglés");
    expect(screen.getByText("Texto del documento 2.")).not.toHaveAttribute("lang");
    for (const word of ["Parallels", "All works", "Strength", "and more", "Paper 1"]) expect(container.textContent).not.toContain(word);
  });

  it("has Spanish words with no paragraph, and a link to the Spanish contents", () => {
    given = "";
    render(<StudyView lang="es" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Paralelos");
    expect(screen.getByRole("link", { name: "Ver todos los documentos" })).toHaveAttribute("href", "/es/documentos");
  });

  it("stays English with no language, and asks with no lang", async () => {
    answer({ ...ANSWER, outside: [{ ...ANSWER.outside[0], english: undefined }], papers: [{ ...ANSWER.papers[0], work: "The Urantia Papers", href: "/papers/x#2:1.1" }], works: [] });
    render(<StudyView />);
    expect(await screen.findByText("Parallels for 1:0.3")).toBeInTheDocument();
    expect(asked).toEqual(["/api/parallels/1%3A0.3"]);
    expect(screen.getByText("All works")).toBeInTheDocument();
    expect(screen.queryByText("in English")).toBeNull();
  });
});
