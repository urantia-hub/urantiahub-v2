import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VisionView } from "./VisionView";

describe("the vision page", () => {
  it("shows today, soon, and the goal, each with a jump link", () => {
    const { container } = render(<VisionView lang="en" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("A quiet place to read the Urantia Papers.");
    for (const id of ["today", "soon", "goal"]) {
      expect(container.querySelector(`section#${id}`)).not.toBeNull();
      expect(container.querySelector(`a[href="#${id}"]`)).not.toBeNull();
    }
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(8);
  });

  it("gives each picture its words and a file of the page", () => {
    const { container } = render(<VisionView lang="en" />);
    const pictures = [...container.querySelectorAll("img")];
    expect(pictures).toHaveLength(11);
    for (const img of pictures) {
      expect(img.getAttribute("alt")).toBeTruthy();
      expect(img.getAttribute("src")).toMatch(/^\/vision\/[a-z0-9-]+\.webp$/);
    }
  });

  it("is Spanish on the Spanish page and says the pictures are English", () => {
    render(<VisionView lang="es" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Un lugar tranquilo para leer los Documentos de Urantia.");
    expect(screen.getByText(/Las imágenes muestran las páginas en inglés/)).toBeInTheDocument();
    expect(screen.queryByText("What the Hub does now")).toBeNull();
  });
});
