import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EnglishOriginal } from "./EnglishOriginal";

const fetchMock = vi.fn();
beforeEach(() => {
  document.body.innerHTML = '<article><p class="para" id="1:0.1"><span class="text">EL Padre Universal es el Dios de toda la creación.</span></p></article>';
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(Response.json({ ref: "1:0.1", text: "THE Universal Father is the God of all creation." }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("EnglishOriginal", () => {
  it("shows the English text inside the paragraph, after its own text, until Ocultar", async () => {
    const onHide = vi.fn();
    render(<EnglishOriginal reference="1:0.1" onHide={onHide} />);
    expect(fetchMock).toHaveBeenCalledWith("/api/english/1%3A0.1", expect.anything());
    const para = document.getElementById("1:0.1")!;
    await waitFor(() => expect(para.querySelector(".orig")).toHaveTextContent("THE Universal Father is the God of all creation."));
    expect(para.querySelector(".orig")).toHaveTextContent("Original en inglés");
    expect(para.querySelector(".orig")?.getAttribute("lang")).toBe("en");
    // The text of the paragraph stays as it was: a copy or an image of it takes no English.
    expect(para.querySelector(".text")).toHaveTextContent("EL Padre Universal es el Dios de toda la creación.");
    await userEvent.click(screen.getByRole("button", { name: "Ocultar" }));
    expect(onHide).toHaveBeenCalled();
  });

  it("says so when the original does not load", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 502 }));
    render(<EnglishOriginal reference="1:0.1" onHide={() => {}} />);
    expect(await screen.findByText("El original no se cargó.")).toBeInTheDocument();
  });
});
