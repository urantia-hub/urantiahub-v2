import type { LangChoice } from "@/account/reader-data";
import type { Lang } from "@/i18n/lang";

// The language that the reader chose in the language sheet, on this browser, and the time of that
// choice. A signed-in reader's choice also goes to the account. Both are named on the Privacy page.
export const READING_LANG_KEY = "hub:lang";
export const READING_LANG_AT_KEY = "hub:lang-at";
const CHANGE = "langchange";

export function readingLang(): Lang | null {
  try {
    const value = window.localStorage.getItem(READING_LANG_KEY);
    return value === "en" || value === "es" ? value : null;
  } catch {
    return null;
  }
}

// A choice from before the time was kept has the time 0, so any choice in the account wins over it.
export function readLangChoice(): LangChoice | null {
  const lang = readingLang();
  if (!lang) return null;
  try {
    const at = Number(window.localStorage.getItem(READING_LANG_AT_KEY));
    return { lang, at: Number.isFinite(at) && at > 0 ? at : 0 };
  } catch {
    return { lang, at: 0 };
  }
}

export function setReadingLang(lang: Lang, at: number = Date.now()) {
  try {
    window.localStorage.setItem(READING_LANG_KEY, lang);
    window.localStorage.setItem(READING_LANG_AT_KEY, String(at));
  } catch {
    // The browser keeps nothing. The page of the other language still opens.
  }
  window.dispatchEvent(new Event(CHANGE));
}

export function subscribeToReadingLang(listener: () => void): () => void {
  window.addEventListener(CHANGE, listener);
  return () => window.removeEventListener(CHANGE, listener);
}
