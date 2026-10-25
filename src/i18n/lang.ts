export type Lang = "en" | "es";

// The API names English "eng".
export function apiLang(lang: Lang): "eng" | "es" {
  return lang === "en" ? "eng" : "es";
}

// The Spanish reader is on only when NEXT_PUBLIC_SPANISH has a value.
export function spanishOn(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SPANISH);
}

// A count in the reader's language. Spanish uses the style of Latin America (es-MX), as search does.
export const numberIn = (lang: Lang) => (n: number) => n.toLocaleString(lang === "es" ? "es-MX" : "en-US");

// The language that a request names in `?lang=`. Any value other than "es" is English.
export function langParam(value: string | null): Lang {
  return value === "es" ? "es" : "en";
}
