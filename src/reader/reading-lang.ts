import type { Lang } from "@/i18n/lang";

// The language that the reader chose in the language sheet, on this browser. Named on the Privacy page.
export const READING_LANG_KEY = "hub:lang";

export function readingLang(): Lang | null {
  try {
    const value = window.localStorage.getItem(READING_LANG_KEY);
    return value === "en" || value === "es" ? value : null;
  } catch {
    return null;
  }
}

export function setReadingLang(lang: Lang) {
  try {
    window.localStorage.setItem(READING_LANG_KEY, lang);
  } catch {
    // The browser keeps nothing. The page of the other language still opens.
  }
}
