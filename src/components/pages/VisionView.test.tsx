import { render, screen, waitFor } from "@testing-library/react";
import { existsSync } from "node:fs";
import { join } from "node:path";
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
      const files = [img.getAttribute("src") ?? "", img.getAttribute("data-dark") ?? ""];
      expect(img.getAttribute("alt")).toBeTruthy();
      expect(files[1]).toBe(files[0].replace(/\.webp$/, "-dark.webp"));
      for (const src of files) {
        expect(src).toMatch(/^\/vision\/[a-z0-9-]+\.webp$/);
        expect(existsSync(join(process.cwd(), "public", src))).toBe(true);
      }
    }
  });

  it("shows the dark files in the dark theme and the light files again after a change back", async () => {
    const { container } = render(<VisionView lang="en" />);
    const img = container.querySelector("img") as HTMLImageElement;
    const light = img.getAttribute("src");
    document.documentElement.dataset.theme = "dark";
    await waitFor(() => expect(img.getAttribute("src")).toBe(light?.replace(/\.webp$/, "-dark.webp")));
    delete document.documentElement.dataset.theme;
    await waitFor(() => expect(img.getAttribute("src")).toBe(light));
  });

  it("is Spanish on the Spanish page and says the pictures are English", () => {
    render(<VisionView lang="es" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Un lugar tranquilo para leer los Documentos de Urantia.");
    expect(screen.getByText(/Las imágenes muestran las páginas en inglés/)).toBeInTheDocument();
    expect(screen.queryByText("What the Hub does now")).toBeNull();
  });
});
