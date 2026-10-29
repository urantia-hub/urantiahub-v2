import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveLastRead } from "./last-read";
import { isAppLaunch, LAUNCH_KEY, launchResumeHref } from "./launch-resume";

const launch = { standalone: true, moving: false, loadedPath: "/", path: "/", launched: false };

describe("isAppLaunch", () => {
  it("is true for the first page of a launch from the home screen", () => {
    expect(isAppLaunch(launch)).toBe(true);
  });

  it("is false in a browser tab, on a page that moves to its twin, and after the first page", () => {
    expect(isAppLaunch({ ...launch, standalone: false })).toBe(false);
    expect(isAppLaunch({ ...launch, moving: true })).toBe(false);
    expect(isAppLaunch({ ...launch, launched: true })).toBe(false);
  });

  it("is false when the app loaded at another page and the reader went Home", () => {
    expect(isAppLaunch({ ...launch, loadedPath: "/papers/paper-1-the-universal-father" })).toBe(false);
  });
});

function standalone(on: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: on && query === "(display-mode: standalone)" }));
}

describe("launchResumeHref", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.spyOn(performance, "getEntriesByType").mockReturnValue([{ name: `${window.location.origin}/` } as PerformanceEntry]);
    window.history.replaceState(null, "", "/");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("opens the section that the reader left, one time in a session", () => {
    standalone(true);
    saveLastRead({ paperId: "38", sectionId: "1", label: null });
    expect(launchResumeHref("en")).toBe("/papers/paper-38-ministering-spirits-of-the-local-universe#38:1");
    expect(launchResumeHref("en")).toBeNull();
  });

  it("opens the Spanish paper on the Spanish home page", () => {
    standalone(true);
    window.history.replaceState(null, "", "/es");
    vi.spyOn(performance, "getEntriesByType").mockReturnValue([{ name: `${window.location.origin}/es` } as PerformanceEntry]);
    saveLastRead({ paperId: "1", sectionId: "1", label: null });
    expect(launchResumeHref("es")).toBe("/es/documentos/documento-1-el-padre-universal#1:1");
  });

  it("keeps the home page with no place in this browser", () => {
    standalone(true);
    expect(launchResumeHref("en")).toBeNull();
    expect(window.sessionStorage.getItem(LAUNCH_KEY)).toBe("1");
  });

  it("does nothing and stores nothing in a browser tab", () => {
    standalone(false);
    saveLastRead({ paperId: "38", sectionId: "1", label: null });
    expect(launchResumeHref("en")).toBeNull();
    expect(window.sessionStorage.getItem(LAUNCH_KEY)).toBeNull();
  });
});
