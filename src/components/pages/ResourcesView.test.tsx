import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RESOURCE_GROUPS } from "@/content/resources";
import { ResourcesView } from "./ResourcesView";

describe("the Resources page", () => {
  it("is the English page as before", () => {
    const { container } = render(<ResourcesView lang="en" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Resources");
    expect(container.querySelector(".lead")).toHaveTextContent("Places to study the Urantia Papers and to meet other readers. UrantiaHub runs only the first group.");
    expect([...container.querySelectorAll("h2")].map((h) => h.textContent)).toEqual(RESOURCE_GROUPS.map((g) => g.title));
    expect(screen.getByRole("link", { name: /^Urantiapedia/ })).toHaveTextContent("An online encyclopedia of the Urantia Papers. (opens in a new tab)");
  });

  it("is Spanish on the Spanish page: each group, each line, and the new-tab words", () => {
    const { container } = render(<ResourcesView lang="es" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Recursos");
    expect([...container.querySelectorAll("h2")].map((h) => h.textContent)).toEqual(RESOURCE_GROUPS.map((g) => g.es));
    const links = [...container.querySelectorAll("a.res")];
    expect(links).toHaveLength(RESOURCE_GROUPS.flatMap((g) => g.resources).length);
    for (const resource of RESOURCE_GROUPS.flatMap((g) => g.resources)) {
      const link = links.find((a) => a.getAttribute("href") === resource.url);
      expect(link).toHaveTextContent(resource.es.about);
      expect(link).not.toHaveTextContent(resource.about);
      expect(link).toHaveTextContent("(se abre en otra pestaña)");
    }
  });
});
