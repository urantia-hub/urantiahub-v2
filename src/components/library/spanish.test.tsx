import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LibraryWork, WorkPage } from "@/content/library";
import { workContents, workFacts } from "@/library/contents";
import { saveTextPlace } from "@/library/text-places";
import { BooksSheet } from "./BooksSheet";
import { HowItWorks } from "./HowItWorks";
import { DHAMMAPADA, dhammapadaPage2, dhammapadaPages, dhammapadaPairs } from "./library-fixtures";
import { LibraryView } from "./LibraryView";
import { WorkContinue } from "./WorkContinue";
import { WorkHome } from "./WorkHome";
import { WorkNav } from "./WorkNav";
import { WorkView } from "./WorkView";

vi.mock("@/analytics", () => ({ track: vi.fn() }));

// The Dhammapada as the Spanish catalog gives it: the same slug and byline, the Spanish words.
const WORK: LibraryWork = { ...DHAMMAPADA, title: "El Dhammapada", tradition: "Budista", summary: "Una colección de los dichos del Buda en verso.", divisionLabel: "capítulo", unitLabel: "versículo" };
const TITLES = ["Los versos gemelos", "Sobre la diligencia"];
const pages: WorkPage[] = dhammapadaPages().map((p, i) => ({ ...p, title: TITLES[i] ?? p.title }));

// The words of the English views that must not be on a Spanish page.
const ENGLISH = ["World texts", "Scriptures", "Classics", "Scripture", "Start reading", "Read at the source", "Contents", "Nearest to the Papers", "In the Papers", "This edition", "Translator", "Tradition", "Rights", "Public domain", "Previous", "Next", "About this work", "All books", "Continue", "verses", "chapters"];
function noEnglish(text: string) {
  for (const words of ENGLISH) expect(text, words).not.toMatch(new RegExp(`\\b${words}\\b`));
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
  vi.stubGlobal("scrollTo", vi.fn());
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("World texts in Spanish", () => {
  it("lists the works with the Spanish words and the Spanish addresses", () => {
    const { container } = render(<LibraryView works={[WORK]} lang="es" />);
    expect(screen.getByRole("heading", { level: 1, name: "Textos del mundo" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cómo se eligen y se comparan estos textos" })).toHaveAttribute("href", "/es/textos/como-funciona");
    expect(screen.getByRole("link", { name: /El Dhammapada/ })).toHaveAttribute("href", "/es/textos/dhammapada");
    expect(screen.getByRole("heading", { name: "Escrituras" })).toBeInTheDocument();
    noEnglish(container.textContent ?? "");
  });

  it("shows the page of a work in Spanish, with the Spanish Papers", () => {
    const contents = workContents(WORK, pages, "es");
    const pairs = dhammapadaPairs().map((p) => ({ ...p, paragraph: { ...p.paragraph, paperTitle: "Las religiones del mundo", text: "Un texto en español." } }));
    const { container } = render(<WorkHome work={WORK} facts={workFacts(WORK, contents, "es")} source={null} start="/es/textos/dhammapada/1" contents={contents} pairs={pairs} lang="es" />);
    expect(screen.getByText("Budista · Escritura")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Empezar a leer/ })).toHaveAttribute("href", "/es/textos/dhammapada/1");
    expect(screen.getByRole("link", { name: "Sobre la diligencia" })).toHaveAttribute("href", "/es/textos/dhammapada/2");
    expect(screen.getByRole("heading", { name: "Contenido" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Lo más cercano a los Documentos" })).toBeInTheDocument();
    expect(container.querySelector(".work-pairs a")).toHaveAttribute("href", expect.stringMatching(/^\/es\/textos\/dhammapada\/at\//));
    // The passage of the work is English; the paragraph of the Papers is Spanish.
    expect(container.querySelector(".work-pairs a .txt")).toHaveAttribute("lang", "en");
    expect(container.querySelector(".work-pairs .to .txt")).not.toHaveAttribute("lang");
    expect(container.querySelector(".work-pairs .to")).toHaveAttribute("href", expect.stringMatching(/^\/es\/documentos\//));
    expect(container.querySelector(".work-in-papers")).toHaveAttribute("href", expect.stringMatching(/^\/es\/documentos\/documento-131-/));
    expect(container.querySelector(".work-in-papers")?.textContent).toContain("Budismo");
    expect(screen.getByText("Traductor")).toBeInTheDocument();
    expect(screen.getByText("Dominio público en los Estados Unidos")).toBeInTheDocument();
    noEnglish((container.textContent ?? "").replace(/“[^”]*”|"[^"]*"/g, "").replace(dhammapadaPairs().map((p) => p.text).join("|"), ""));
  });

  it("shows a chapter in Spanish, with the line that the text is English", () => {
    const { container } = render(<WorkView work={WORK} page={pages[1]} pages={pages} passages={dhammapadaPage2()} lang="es" />);
    expect(screen.getByText("El Dhammapada · Capítulo 2")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Sobre la diligencia" })).toBeInTheDocument();
    expect(screen.getByText("El texto de esta obra está en inglés.")).toBeInTheDocument();
    expect(container.querySelector(".para")).toHaveAttribute("lang", "en");
    expect(screen.getByRole("link", { name: /Anterior/ })).toHaveAttribute("href", "/es/textos/dhammapada/1");
    expect(screen.getByRole("link", { name: /Siguiente/ })).toHaveAttribute("href", "/es/textos/dhammapada/3");
    expect(container.querySelector(".work-meta")?.textContent).toContain("12 versículos");
    noEnglish(container.querySelector(".paper-head")?.textContent ?? "");
  });

  it("keeps the English chapter with no line about its language", () => {
    const { container } = render(<WorkView work={DHAMMAPADA} page={dhammapadaPages()[1]} pages={dhammapadaPages()} passages={dhammapadaPage2()} />);
    expect(container.querySelector(".work-lang")).toBeNull();
    expect(container.querySelector(".para")).not.toHaveAttribute("lang");
  });

  it("speaks Spanish in the dock and the chapters sheet", () => {
    render(
      <WorkNav
        work={{ slug: "dhammapada", title: WORK.title, short: "Dhammapada", summary: WORK.summary }}
        pages={pages.map((p) => ({ key: p.key, number: String(p.division), title: p.title as string, count: `${p.count} versículos` }))}
        current="2"
        title="Sobre la diligencia"
        label="Capítulo 2"
        lang="es"
      />,
    );
    expect(screen.getByRole("link", { name: "Anterior: Los versos gemelos" })).toHaveAttribute("href", "/es/textos/dhammapada/1");
    fireEvent.click(screen.getByRole("button", { name: "Dhammapada Sobre la diligencia. Abrir los capítulos" }));
    const sheet = screen.getByRole("dialog", { name: "Capítulos" });
    expect(within(sheet).getByRole("button", { name: "Cerrar los capítulos" })).toBeInTheDocument();
    expect(within(sheet).getByRole("link", { name: "Acerca de esta obra" })).toHaveAttribute("href", "/es/textos/dhammapada");
    expect(within(sheet).getByRole("link", { name: /Los versos gemelos/ })).toHaveAttribute("href", "/es/textos/dhammapada/1");
  });

  it("speaks Spanish in the books sheet", () => {
    const books = [{ code: "John", name: "Juan", title: "El Evangelio según Juan", part: "Nuevo Testamento", base: "john-", numbers: [1, 2, 3] }];
    render(<BooksSheet work={{ slug: "bible", title: "La Biblia", summary: "" }} books={books} label="Los libros de la Biblia" unit="chapter" current={{ book: "John", chapter: 3 }} onClose={vi.fn()} lang="es" />);
    expect(screen.getByRole("button", { name: "Cerrar los libros" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Juan 3 capítulos/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Juan/ }));
    expect(screen.getByRole("button", { name: "Todos los libros" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "3" })).toHaveAttribute("href", "/es/textos/bible/john-3");
  });

  it("offers to continue in Spanish", () => {
    saveTextPlace("dhammapada", { key: "2", title: "Sobre la diligencia", label: "Capítulo 2" });
    render(<WorkContinue slug="dhammapada" start="/es/textos/dhammapada/1" lang="es" />);
    expect(screen.getByRole("link", { name: /Continuar/ })).toHaveAttribute("href", "/es/textos/dhammapada/2");
    expect(screen.getByRole("link", { name: "o empezar desde el principio" })).toHaveAttribute("href", "/es/textos/dhammapada/1");
  });

  it("says how World texts work in Spanish, with the Spanish title of Paper 131", () => {
    const { container } = render(<HowItWorks works={[WORK]} example={null} lang="es" />);
    expect(screen.getByRole("heading", { level: 1, name: "Cómo funcionan los textos del mundo" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Qué es un paralelo" })).toBeInTheDocument();
    expect(container.textContent).toContain("Documento 131, “");
    expect(container.textContent).not.toMatch(/Paper 131|parallel|The number|Suggest/);
  });
});
