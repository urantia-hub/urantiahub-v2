"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { PairQuote } from "./PairQuotes";
import { type Chosen, pathOf, targetOf, type ViewPair, wordsOf } from "./view";

const PairShareSheet = lazy(() => import("./PairShareSheet"));

// The two sides and "Share". The page holds the choice: a press in the share sheet changes the quotes, the
// card, and the address of the page, so a reload or a copy of the address keeps it.
export function PairView({ pair, start }: { pair: ViewPair; start: { a: number[]; b: number[] } }) {
  const [chosen, setChosen] = useState<Chosen>(() => ({ a: new Set(start.a), b: new Set(start.b) }));
  const [open, setOpen] = useState(false);
  const path = pathOf(pair, chosen);

  useEffect(() => {
    if (window.location.pathname !== path) window.history.replaceState(window.history.state, "", path);
  }, [path]);

  const choose = (side: "a" | "b", i: number) =>
    setChosen((was) => {
      const next = new Set(was[side]);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return { ...was, [side]: next };
    });

  return (
    <>
      <div className="pair-cols">
        <PairQuote href={targetOf(pair.a, chosen.a)} eyebrow={pair.a.eyebrow} kind={null} words={wordsOf(pair.a, chosen.a)} source={pair.a.source} go="Read in the paper" />
        <div className="pair-and">and</div>
        <PairQuote href={targetOf(pair.b, chosen.b)} eyebrow={pair.b.eyebrow} kind={pair.b.kind} words={wordsOf(pair.b, chosen.b)} source={pair.b.source} go="Read in World texts" />
      </div>
      <div className="pair-acts">
        <button type="button" className="pair-share-button" onClick={() => setOpen(true)}>
          <Icon name="share" />
          Share
        </button>
      </div>
      {open && (
        <Suspense fallback={null}>
          <PairShareSheet pair={pair} chosen={chosen} onChoose={choose} onClose={() => setOpen(false)} onCopied={() => {}} />
        </Suspense>
      )}
    </>
  );
}
