"use client";

import { useState } from "react";

// A long passage with no choice shows 7 lines and "Show all". The button is outside the link of the quote.
export const LONG = 420;

// `english` marks a quote that is English on a page of another language, with `note` below it that says so.
type Props = { href: string; eyebrow: string; kind: string | null; words: string; source: string; go: string; showAll: string; english?: boolean; note?: string };

export function PairQuote({ href, eyebrow, kind, words, source, go, showAll, english, note }: Props) {
  const [all, setAll] = useState(false);
  const clamp = words.length > LONG && !all;
  return (
    <div className="pair-side">
      <a className="pair-quote" href={href}>
        <span className="eyebrow">{eyebrow}</span>
        <span className={`pair-kind${kind ? "" : " blank"}`} aria-hidden={kind ? undefined : true}>
          {kind ?? "\u00a0"}
        </span>
        <blockquote className={clamp ? "clamp" : undefined} lang={english ? "en" : undefined}>“{words.replace(/^“/, "")}”</blockquote>
      </a>
      {clamp && (
        <button type="button" className="pair-more" onClick={() => setAll(true)}>
          {showAll}
        </button>
      )}
      <a className="pair-src" href={href}>
        <span>{source}</span>
        <span className="pair-go">{go} →</span>
      </a>
      {note && <p className="pair-lang">{note}</p>}
    </div>
  );
}
