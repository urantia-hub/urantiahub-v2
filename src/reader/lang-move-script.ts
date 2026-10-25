import type { Lang } from "@/i18n/lang";
import { READING_LANG_KEY } from "./reading-lang";

// Marks this tab after its first page, so only the first page of a visit moves. Named on the Privacy page.
export const VISIT_KEY = "hub:visit";

// Runs first in <body>, before the first paint, and only while Spanish is on (RootShell). The first page
// of a visit opens in the language that the reader chose last, when that page has a twin. A page in the
// tab after it never moves: a reader who opens an English page from a Spanish one stays there. The page
// that moves is hidden, because the rest of it parses while the twin loads.
export const LANG_MOVE_SCRIPT = `(function(){try{if(sessionStorage.getItem(${JSON.stringify(VISIT_KEY)}))return;sessionStorage.setItem(${JSON.stringify(VISIT_KEY)},"1");document.documentElement.setAttribute("data-first-page","")}catch(e){return}var l;try{l=localStorage.getItem(${JSON.stringify(READING_LANG_KEY)})}catch(e){return}if((l!=="en"&&l!=="es")||l===document.documentElement.lang)return;var a=document.querySelector('link[rel="alternate"][hreflang="'+l+'"]');if(!a)return;var p=new URL(a.getAttribute("href"),location.href).pathname;if(p!==location.pathname){document.documentElement.style.visibility="hidden";location.replace(p+location.search+location.hash)}})();`;

// The same move after the pull from the account, on the first page of a visit (`data-first-page`): the
// account held the other language, and this browser did not know it before the page painted.
export function moveToTwin(lang: Lang): void {
  const href = document.querySelector(`link[rel="alternate"][hreflang="${lang}"]`)?.getAttribute("href");
  if (!href) return;
  const path = new URL(href, window.location.href).pathname;
  if (path !== window.location.pathname) window.location.replace(path + window.location.search + window.location.hash);
}
