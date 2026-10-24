import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const states = {
  en: { mode: "on", have: 197, total: 197, can: true },
  es: { mode: "off", have: 0, total: 197, can: true },
};
const start = vi.fn();
const remove = vi.fn();
vi.mock("@/reader/offline", () => ({
  offlineState: (lang: "en" | "es") => states[lang],
  serverOfflineState: () => ({ mode: "off", have: 0, total: 197, can: false }),
  subscribeToOffline: () => () => {},
  startOffline: (lang: string) => start(lang),
  removeOffline: (lang: string) => remove(lang),
}));

import { LanguageSheet } from "./LanguageSheet";

beforeEach(() => {
  window.localStorage.clear();
  start.mockClear();
  remove.mockClear();
  window.history.replaceState(null, "", "/es/documentos/documento-1-el-padre-universal#1:0.1");
});

describe("LanguageSheet", () => {
  it("offers both languages, with the language of the page checked", () => {
    render(<LanguageSheet lang="es" onClose={() => {}} />);
    expect(screen.getByText("Leer en")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Español/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /English/ })).toHaveAttribute("aria-checked", "false");
  });

  it("has one offline switch for each language, each with its own state", () => {
    render(<LanguageSheet lang="es" onClose={() => {}} />);
    expect(screen.getByText("Sin conexión")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /English/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Descargado · 197 documentos")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /Español/ })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("Descarga los 197 documentos para leerlos sin conexión")).toBeInTheDocument();
  });

  it("turns the download of one language on", async () => {
    render(<LanguageSheet lang="es" onClose={() => {}} />);
    await userEvent.click(screen.getByRole("switch", { name: /Español/ }));
    expect(start).toHaveBeenCalledWith("es");
    await userEvent.click(screen.getByRole("switch", { name: /English/ }));
    expect(remove).toHaveBeenCalledWith("en");
  });

  it("goes to the same paragraph in the other language and keeps the choice", async () => {
    const navigate = vi.fn();
    render(<LanguageSheet lang="es" onClose={() => {}} navigate={navigate} />);
    await userEvent.click(screen.getByRole("radio", { name: /English/ }));
    expect(navigate).toHaveBeenCalledWith("/papers/paper-1-the-universal-father#1:0.1");
    expect(window.localStorage.getItem("hub:lang")).toBe("en");
  });

  it("speaks English on an English page", () => {
    render(<LanguageSheet lang="en" onClose={() => {}} />);
    expect(screen.getByText("Read in")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /^English/ })).toHaveAttribute("aria-checked", "true");
  });
});
