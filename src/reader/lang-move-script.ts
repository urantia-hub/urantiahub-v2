import { READING_LANG_KEY } from "./reading-lang";

// Marks this tab after its first page, so only the first page of a visit moves. Named on the Privacy page.
export const VISIT_KEY = "hub:visit";

// Runs first in <body>, before the first paint, and only while Spanish is on (RootShell). The first page
// of a visit opens in the language that the reader chose last, when that page has a twin. A page in the
// tab after it never moves: a reader who opens an English page from a Spanish one stays there.
export const LANG_MOVE_SCRIPT = `(function(){try{if(sessionStorage.getItem(${JSON.stringify(VISIT_KEY)}))return;sessionStorage.setItem(${JSON.stringify(VISIT_KEY)},"1")}catch(e){return}var l;try{l=localStorage.getItem(${JSON.stringify(READING_LANG_KEY)})}catch(e){return}if((l!=="en"&&l!=="es")||l===document.documentElement.lang)return;var a=document.querySelector('link[rel="alternate"][hreflang="'+l+'"]');if(!a)return;var p=new URL(a.getAttribute("href"),location.href).pathname;if(p!==location.pathname)location.replace(p+location.search+location.hash)})();`;
