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

// The same page in the other language, or the home page of that language when the page has no twin.
export function counterpart(pathname: string, to: Lang): string {
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
  const share = from === "es" ? /^\/es(\/s\/.+)$/.exec(path) : /^(\/s\/.+)$/.exec(path);
  if (share) return `${to === "es" ? "/es" : ""}${share[1]}${tail}`;
  if (path === (from === "es" ? "/es/buscar" : "/search")) return `${searchHref(to)}${tail}`;
  if (path === savedHref(from)) return `${savedHref(to)}${tail}`;
  if (path === homeHref(from)) return homeHref(to);
  if (path === contentsHref(from)) return contentsHref(to);
  return homeHref(to);
}
