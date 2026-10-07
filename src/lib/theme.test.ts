import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyTheme, currentTheme, readStoredTheme, subscribeToTheme, THEME_INIT_SCRIPT, THEME_KEY } from "./theme";

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  document.head.innerHTML = '<meta name="theme-color" content="#fbf8f2">';
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("readStoredTheme", () => {
  it("is light when nothing is stored", () => {
    expect(readStoredTheme()).toBe("light");
  });
  it("is dark only when the reader chose dark", () => {
    window.localStorage.setItem(THEME_KEY, "dark");
    expect(readStoredTheme()).toBe("dark");
  });
  it("is light for any other stored value", () => {
    window.localStorage.setItem(THEME_KEY, "system");
    expect(readStoredTheme()).toBe("light");
  });
  it("is light when the browser blocks storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readStoredTheme()).toBe("light");
  });
});

describe("applyTheme", () => {
  it("sets the theme on the document, stores it, and updates the browser color", () => {
    applyTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("dark");
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute("content", "#17150f");
    applyTheme("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("light");
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute("content", "#fbf8f2");
  });

  it("still changes the theme when the browser blocks storage", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    applyTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("tells each subscriber", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToTheme(listener);
    applyTheme("dark");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    applyTheme("light");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("currentTheme", () => {
  it("is light until the document says dark", () => {
    expect(currentTheme()).toBe("light");
    document.documentElement.dataset.theme = "dark";
    expect(currentTheme()).toBe("dark");
  });
});

describe("THEME_INIT_SCRIPT", () => {
  const run = () => new Function(THEME_INIT_SCRIPT)();

  it("leaves a new visitor in light, whatever the system setting is", () => {
    run();
    expect(document.documentElement.dataset.theme).not.toBe("dark");
  });
  it("sets dark before the first paint for a reader who chose dark", () => {
    window.localStorage.setItem(THEME_KEY, "dark");
    run();
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute("content", "#17150f");
  });
  it("does not throw when the browser blocks storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(run).not.toThrow();
  });
});
