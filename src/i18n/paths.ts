import { paperPath } from "@/content/paper-index";
import { idFromSlug } from "@/lib/paper-url";
import { refForLink } from "@/reader/share-link";
import type { Lang } from "./lang";

export function paperHref(lang: Lang, id: number): string {
  return paperPath(String(id), lang);
}

export function homeHref(lang: Lang): string {
  return lang === "es" ? "/es" : "/";
}

export function contentsHref(lang: Lang): string {
  return lang === "es" ? "/es/documentos" : "/papers";
}

export function searchHref(lang: Lang, q?: string): string {
  const base = lang === "es" ? "/es/buscar" : "/search";
  return q ? `${base}?q=${encodeURIComponent(q)}` : base;
}

// The Saved page, or the page of the notes of one paragraph.
export function savedHref(lang: Lang, ref?: string): string {
  const base = lang === "es" ? "/es/guardados" : "/saved";
  return ref ? `${base}?ref=${encodeURIComponent(ref)}` : base;
}

export function shareHref(lang: Lang, ref: string): string {
  return `${lang === "es" ? "/es" : ""}/s/${refForLink(ref)}`;
}

// World texts, a work, or a page of a work. The slug and the page key are the same in both languages.
export function textsHref(lang: Lang, slug?: string, key?: string): string {
  const base = lang === "es" ? "/es/textos" : "/texts";
  return [base, slug, key].filter(Boolean).join("/");
}

export function howHref(lang: Lang): string {
  return lang === "es" ? "/es/textos/como-funciona" : "/texts/how-it-works";
}

// The page of World texts in the other language: the same work and page, and How it works by its own name.
function textsTwin(path: string, from: Lang, to: Lang): string | null {
  const found = (from === "es" ? /^\/es\/textos(\/.*)?$/ : /^\/texts(\/.*)?$/).exec(path);
  if (!found) return null;
  if (path === howHref(from)) return howHref(to);
  return `${textsHref(to)}${found[1] ?? ""}`;
}

// The fixed pages and their Spanish twins: [English, Spanish].
export const PAGE_TWINS: readonly (readonly [en: string, es: string])[] = [
  ["/you", "/es/tu"],
  ["/notifications", "/es/avisos"],
  ["/emails", "/es/correos"],
  ["/parallels", "/es/paralelos"],
  ["/about", "/es/acerca-de"],
  ["/resources", "/es/recursos"],
  ["/releases", "/es/novedades"],
];

// The fixed pages that search engines list, in a language: in Spanish, only those with a twin.
const FIXED_PAGES = ["/", "/papers", "/about", "/resources", "/releases", "/privacy", "/terms"];
export function fixedPages(lang: Lang): string[] {
  if (lang === "en") return FIXED_PAGES;
  return [homeHref(lang), contentsHref(lang), ...FIXED_PAGES.map((en) => pageHref(lang, en)).filter((path) => path.startsWith("/es/"))];
}

// The address of a fixed page in a language, from its English path. A page with no twin keeps its path.
export function pageHref(lang: Lang, en: string): string {
  if (lang === "en") return en;
  return PAGE_TWINS.find((twin) => twin[0] === en)?.[1] ?? en;
}

// The same page in the other language, or the home page of that language when the page has no twin.
export function counterpart(pathname: string, to: Lang): string {
  return twinPath(pathname, to) ?? homeHref(to);
}

// The same page in the other language, with its query and its paragraph, or null when it has none.
export function twinPath(pathname: string, to: Lang): string | null {
  const cut = pathname.search(/[?#]/);
  const path = cut === -1 ? pathname : pathname.slice(0, cut);
  const tail = cut === -1 ? "" : pathname.slice(cut);
  const from: Lang = path === "/es" || path.startsWith("/es/") ? "es" : "en";
  if (from === to) return pathname;

  const paper = from === "es" ? /^\/es\/documentos\/([^/]+)$/.exec(path) : /^\/papers\/([^/]+)$/.exec(path);
  if (paper) {
    const id = idFromSlug(paper[1]);
    if (id !== null) return `${paperHref(to, Number(id))}${tail}`;
  }
  // A share page, its pick, and a pair page (up to five parts): the same parts in each language.
  const share = from === "es" ? /^\/es(\/s(?:\/[^/]+){1,5})$/.exec(path) : /^(\/s(?:\/[^/]+){1,5})$/.exec(path);
  if (share) return `${to === "es" ? "/es" : ""}${share[1]}${tail}`;
  if (path === (from === "es" ? "/es/buscar" : "/search")) return `${searchHref(to)}${tail}`;
  if (path === savedHref(from)) return `${savedHref(to)}${tail}`;
  const texts = textsTwin(path, from, to);
  if (texts) return `${texts}${tail}`;
  const row = PAGE_TWINS.find((twin) => twin[from === "en" ? 0 : 1] === path);
  if (row) return `${row[to === "en" ? 0 : 1]}${tail}`;
  if (path === homeHref(from)) return homeHref(to);
  if (path === contentsHref(from)) return contentsHref(to);
  return null;
}
