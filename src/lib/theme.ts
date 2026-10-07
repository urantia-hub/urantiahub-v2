export type Theme = "light" | "dark";

export const THEME_KEY = "theme";

const BROWSER_COLOR: Record<Theme, string> = { light: "#fbf8f2", dark: "#17150f" };
const CHANGE_EVENT = "themechange";

// Light is the default for each new visitor. The system setting does not decide.
export function readStoredTheme(): Theme {
  try {
    return window.localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

// Changes the theme now, and remembers it in this browser if storage is available.
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", BROWSER_COLOR[theme]);
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage is blocked. The theme still changes for this page.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeToTheme(listener: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}

// Runs before the first paint, so a reader who chose dark never sees a light flash.
export const THEME_INIT_SCRIPT = `try{if(localStorage.getItem("${THEME_KEY}")==="dark"){document.documentElement.dataset.theme="dark";var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content","${BROWSER_COLOR.dark}")}}catch(e){}`;
