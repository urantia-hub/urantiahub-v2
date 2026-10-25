import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RELEASES, releaseDate } from "@/content/releases";
import { ReleasesView } from "./ReleasesView";

describe("the Releases page", () => {
  it("is the English page as before", () => {
    const { container } = render(<ReleasesView lang="en" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Releases");
    expect(container.querySelector(".lead")).toHaveTextContent("What changed in UrantiaHub, the newest first.");
    expect([...container.querySelectorAll("h2")].map((h) => h.textContent)).toEqual(RELEASES.map((r) => r.title));
    expect(container.querySelector("time")).toHaveTextContent(releaseDate(RELEASES[0].date));
  });

  it("is Spanish on the Spanish page: the dates, the titles, and the changes", () => {
    const { container } = render(<ReleasesView lang="es" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Novedades");
    expect([...container.querySelectorAll("h2")].map((h) => h.textContent)).toEqual(RELEASES.map((r) => r.es.title));
    expect(container.querySelector("time")).toHaveTextContent(releaseDate(RELEASES[0].date, "es"));
    expect([...container.querySelectorAll("li")].map((li) => li.textContent)).toEqual(RELEASES.flatMap((r) => r.es.changes));
  });
});
