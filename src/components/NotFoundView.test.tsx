import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NotFoundView } from "./NotFoundView";

describe("NotFoundView", () => {
  it("says in English that the address has no page, with the way to the papers", () => {
    render(<NotFoundView lang="en" />);
    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "All papers" })).toHaveAttribute("href", "/papers");
  });

  it("says the same in Spanish, with the way to the Spanish contents", () => {
    render(<NotFoundView lang="es" />);
    expect(screen.getByRole("heading", { level: 1, name: "Página no encontrada" })).toBeInTheDocument();
    expect(screen.getByText("Esta dirección no tiene página.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Todos los documentos" })).toHaveAttribute("href", "/es/documentos");
  });
});
