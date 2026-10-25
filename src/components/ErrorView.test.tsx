import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorView } from "./ErrorView";

describe("ErrorView", () => {
  it("speaks Spanish and links to the Spanish contents", () => {
    render(<ErrorView lang="es" reset={vi.fn()} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Esta página no cargó");
    expect(screen.getByText("El sitio no pudo obtener esta página. El fallo es nuestro.")).toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveTextContent("Volver a intentar");
    expect(screen.getByRole("link", { name: "Todos los documentos" })).toHaveAttribute("href", "/es/documentos");
  });

  it("keeps the English words and links to the English contents", () => {
    const reset = vi.fn();
    render(<ErrorView lang="en" reset={reset} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("This page did not load");
    expect(screen.getByText("The site could not get this page. The fault is on our side.")).toBeInTheDocument();
    screen.getByRole("button", { name: "Try again" }).click();
    expect(reset).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "All papers" })).toHaveAttribute("href", "/papers");
  });
});
