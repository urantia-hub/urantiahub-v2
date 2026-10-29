import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveLastRead } from "./last-read";
import { LAUNCH_KEY, LAUNCH_MAX_MS, LAUNCH_SCRIPT, launchResumeHref, watchLaunchEnd } from "./launch-resume";

const root = document.documentElement;
const runScript = () => new Function(LAUNCH_SCRIPT)();

function standalone(on: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: on && query === "(display-mode: standalone)" }));
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  root.removeAttribute("data-launch");
  root.style.visibility = "";
  window.history.replaceState(null, "", "/");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("the launch script", () => {
  it("covers the home page with the still mark at the first launch of the app with a place", () => {
    standalone(true);
    saveLastRead({ paperId: "38", sectionId: "1", label: null });
    runScript();
    expect(root.getAttribute("data-launch")).toBe("");
    expect(window.sessionStorage.getItem(LAUNCH_KEY)).toBe("1");
  });

  it("marks the session but shows no mark with no place", () => {
    standalone(true);
    runScript();
    expect(root.hasAttribute("data-launch")).toBe(false);
    expect(window.sessionStorage.getItem(LAUNCH_KEY)).toBe("1");
  });

  it("does nothing a second time in the session: a reload keeps the home page", () => {
    standalone(true);
    saveLastRead({ paperId: "38", sectionId: "1", label: null });
    runScript();
    root.removeAttribute("data-launch");
    runScript();
    expect(root.hasAttribute("data-launch")).toBe(false);
  });

  it("does nothing and stores nothing in a browser tab, or on a page that is not the home page", () => {
    saveLastRead({ paperId: "38", sectionId: "1", label: null });
    standalone(false);
    runScript();
    standalone(true);
    window.history.replaceState(null, "", "/papers");
    runScript();
    expect(root.hasAttribute("data-launch")).toBe(false);
    expect(window.sessionStorage.getItem(LAUNCH_KEY)).toBeNull();
  });

  it("waits for the twin when the language move hides the page, and runs on the Spanish home page", () => {
    standalone(true);
    saveLastRead({ paperId: "1", sectionId: "1", label: null });
    root.style.visibility = "hidden";
    runScript();
    expect(window.sessionStorage.getItem(LAUNCH_KEY)).toBeNull();
    root.style.visibility = "";
    window.history.replaceState(null, "", "/es");
    runScript();
    expect(root.getAttribute("data-launch")).toBe("");
  });
});

describe("launchResumeHref", () => {
  it("opens the section that the reader left while the still mark shows", () => {
    saveLastRead({ paperId: "38", sectionId: "1", label: null });
    root.setAttribute("data-launch", "");
    expect(launchResumeHref("en")).toBe("/papers/paper-38-ministering-spirits-of-the-local-universe#38:1");
    expect(launchResumeHref("es")).toMatch(/^\/es\/documentos\/documento-38-[a-z-]+#38:1$/);
  });

  it("keeps the home page with no still mark", () => {
    saveLastRead({ paperId: "38", sectionId: "1", label: null });
    expect(launchResumeHref("en")).toBeNull();
  });

  it("ends the mark when the stored place is not one that the Hub can open", () => {
    vi.useFakeTimers();
    window.localStorage.setItem("hub:last-read", JSON.stringify({ paperId: "900", sectionId: "1", label: null, at: 5 }));
    root.setAttribute("data-launch", "");
    expect(launchResumeHref("en")).toBeNull();
    expect(root.getAttribute("data-launch")).toBe("leaving");
    vi.advanceTimersByTime(250);
    expect(root.hasAttribute("data-launch")).toBe(false);
  });
});

describe("watchLaunchEnd", () => {
  it("fades the mark when the address leaves the home page", () => {
    vi.useFakeTimers();
    root.setAttribute("data-launch", "");
    watchLaunchEnd("/");
    vi.advanceTimersByTime(200);
    expect(root.getAttribute("data-launch")).toBe("");
    window.history.replaceState(null, "", "/papers/paper-1-the-universal-father");
    vi.advanceTimersByTime(60);
    expect(root.getAttribute("data-launch")).toBe("leaving");
    vi.advanceTimersByTime(250);
    expect(root.hasAttribute("data-launch")).toBe(false);
  });

  it("shows the home page after the most time with no paper", () => {
    vi.useFakeTimers();
    root.setAttribute("data-launch", "");
    watchLaunchEnd("/");
    vi.advanceTimersByTime(LAUNCH_MAX_MS - 100);
    expect(root.getAttribute("data-launch")).toBe("");
    vi.advanceTimersByTime(200);
    expect(root.getAttribute("data-launch")).toBe("leaving");
  });
});
