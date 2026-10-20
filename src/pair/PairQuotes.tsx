"use client";

import { useState } from "react";

// A long passage with no choice shows 7 lines and "Show all". The button is outside the link of the quote.
export const LONG = 420;

export function PairQuote({ href, eyebrow, kind, words, source, go }: { href: string; eyebrow: string; kind: string | null; words: string; source: string; go: string }) {
  const [all, setAll] = useState(false);
  const clamp = words.length > LONG && !all;
  return (
    <div className="pair-side">
      <a className="pair-quote" href={href}>
        <span className="eyebrow">{eyebrow}</span>
        <span className={`pair-kind${kind ? "" : " blank"}`} aria-hidden={kind ? undefined : true}>
          {kind ?? "\u00a0"}
        </span>
        <blockquote className={clamp ? "clamp" : undefined}>“{words.replace(/^“/, "")}”</blockquote>
      </a>
      {clamp && (
        <button type="button" className="pair-more" onClick={() => setAll(true)}>
          Show all
        </button>
      )}
      <a className="pair-src" href={href}>
        <span>{source}</span>
        <span className="pair-go">{go} →</span>
      </a>
    </div>
  );
}
