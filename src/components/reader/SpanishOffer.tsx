"use client";

import { track } from "@/analytics";
import { READING_LANG_KEY, setReadingLang } from "@/reader/reading-lang";

// Before the first paint: a browser in Spanish whose reader chose no language yet gets the offer.
// CSS shows it by the mark on <html>, so the page stays static and nothing moves.
export const OFFER_SCRIPT = `try{var l=localStorage.getItem(${JSON.stringify(READING_LANG_KEY)});if(/^es\\b/i.test(navigator.language)&&l!=="en"&&l!=="es")document.documentElement.dataset.offerEs=""}catch(e){}`;

// "Leer en español" under the title of an English paper. It opens the same paper in Spanish.
export function SpanishOffer({ href, title }: { href: string; title: string }) {
  return (
    <a
      className="offer"
      href={href}
      lang="es"
      onClick={() => {
        setReadingLang("es");
        track("language_offered");
      }}
    >
      Leer en español <small>· {title}</small>
    </a>
  );
}
