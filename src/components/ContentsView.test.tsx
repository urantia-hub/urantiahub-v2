import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PARTS_ES, partNumeral } from "@/content/paper-index";
import { ContentsView } from "./ContentsView";

describe("partNumeral", () => {
  it("gives the Roman numeral of a part", () => {
    expect(["1", "2", "3", "4"].map(partNumeral)).toEqual(["I", "II", "III", "IV"]);
  });
});

describe("ContentsView", () => {
  it("links to all 197 papers", () => {
    render(<ContentsView />);
    const links = screen.getAllByRole("link").filter((a) => a.getAttribute("href")?.startsWith("/papers/"));
    expect(links).toHaveLength(197);
    const foreword = screen.getByRole("region", { name: "Foreword" });
    expect(within(foreword).getByRole("link", { name: "Foreword" })).toHaveAttribute("href", "/papers/foreword");
    expect(screen.getByRole("link", { name: "1 The Universal Father" })).toHaveAttribute(
      "href",
      "/papers/paper-1-the-universal-father",
    );
  });

  it("shows each part with its range, title, and sponsorship line", () => {
    render(<ContentsView />);
    const part = screen.getByRole("region", { name: "The Central and Superuniverses" });
    expect(within(part).getByText("Part I · Papers 1–31")).toBeInTheDocument();
    expect(within(part).getByText(/^Sponsored by a Uversa Corps/)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "The Life and Teachings of Jesus" })).toBeInTheDocument();
  });

  // The Foreword is the first entry of the list, a few lines below. A jump link to it showed the word twice.
  it("has jump links to the four parts and World texts, and names the Foreword one time", () => {
    render(<ContentsView />);
    const jump = screen.getByRole("navigation", { name: "Parts" });
    expect(within(jump).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["#part-1", "#part-2", "#part-3", "#part-4", "/texts"]);
    expect(screen.getAllByText("Foreword")).toHaveLength(1);
  });

  // LIBRARY_LINKS turns the way to World texts off.
  it("has no way to World texts while they are unlinked", () => {
    render(<ContentsView libraryLinks={false} />);
    expect(screen.queryByRole("region", { name: "Beside the Papers" })).toBeNull();
    expect(screen.queryByRole("link", { name: /World texts/ })).toBeNull();
  });

  it("ends the jump row and the page with World texts when it is linked", () => {
    render(<ContentsView libraryLinks />);
    const jump = screen.getByRole("navigation", { name: "Parts" });
    expect(within(jump).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["#part-1", "#part-2", "#part-3", "#part-4", "/texts"]);
    const beside = screen.getByRole("region", { name: "Beside the Papers" });
    expect(within(beside).getByRole("heading", { level: 2, name: "World texts" })).toBeInTheDocument();
    expect(beside).toHaveTextContent("The Bible and 21 other texts of the world's religions, each with the passages of the Papers that are near to it in meaning.");
    expect(within(beside).getByRole("link", { name: "Browse world texts" })).toHaveAttribute("href", "/texts");
  });
});

describe("ContentsView in Spanish", () => {
  it("has the Spanish title, line, and links to all 197 Spanish papers", () => {
    render(<ContentsView lang="es" />);
    expect(screen.getByRole("heading", { level: 1, name: "Documentos" })).toBeInTheDocument();
    expect(screen.getByText("Un prólogo y 196 documentos, en cuatro partes.")).toBeInTheDocument();
    const links = screen.getAllByRole("link").filter((a) => a.getAttribute("href")?.startsWith("/es/documentos/"));
    expect(links).toHaveLength(197);
    const foreword = screen.getByRole("region", { name: "Prólogo" });
    expect(within(foreword).getByRole("link", { name: "Prólogo" })).toHaveAttribute("href", "/es/documentos/prologo");
  });

  it("shows each part with its Spanish range, title, and sponsorship from the index", () => {
    render(<ContentsView lang="es" />);
    const first = PARTS_ES[1];
    const part = screen.getByRole("region", { name: first.title });
    expect(within(part).getByText("Parte I · Documentos 1–31")).toBeInTheDocument();
    expect(within(part).getByText(first.sponsorship!)).toBeInTheDocument();
  });

  it("names the parts in Spanish, and Otras obras goes to the English World texts", () => {
    render(<ContentsView lang="es" libraryLinks />);
    const jump = screen.getByRole("navigation", { name: "Partes" });
    expect(within(jump).getAllByRole("link").map((a) => a.textContent)).toEqual(["Parte I", "Parte II", "Parte III", "Parte IV", "Otras obras"]);
    expect(within(jump).getByRole("link", { name: "Otras obras" })).toHaveAttribute("href", "/texts");
    const beside = screen.getByRole("region", { name: "Junto a los Documentos" });
    expect(within(beside).getByRole("heading", { level: 2, name: "Otras obras" })).toBeInTheDocument();
    expect(within(beside).getByRole("link", { name: "Ver las otras obras" })).toHaveAttribute("href", "/texts");
  });
});
