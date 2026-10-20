"use client";

import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { track } from "@/analytics";
import { Icon } from "@/components/icons";
import { PairBack } from "./PairBack";
import { PairQuote } from "./PairQuotes";
import { type Chosen, pathOf, targetOf, type ViewPair, wordsOf } from "./view";

const PairShareSheet = lazy(() => import("./PairShareSheet"));

// The side of the parallels sheet that the reader came from (`?from=`), read one time for each pair address:
// the page then takes `from` out of its address, and the back link stays.
let came: { path: string; from: "a" | "b" | null } | null = null;
function cameFrom(): "a" | "b" | null {
  const path = window.location.pathname;
  if (came?.path !== path) {
    const from = new URLSearchParams(window.location.search).get("from");
    came = { path, from: from === "paper" ? "a" : from === "text" ? "b" : null };
  }
  return came.from;
}
const noSubscribe = () => () => {};

// The two sides and "Share". The page holds the choice: a press in the share sheet changes the quotes, the
// card, and the address of the page, so a reload or a copy of the address keeps it.
export function PairView({ pair, start }: { pair: ViewPair; start: { a: number[]; b: number[] } }) {
  const [chosen, setChosen] = useState<Chosen>(() => ({ a: new Set(start.a), b: new Set(start.b) }));
  const [open, setOpen] = useState(false);
  const from = useSyncExternalStore(noSubscribe, cameFrom, () => null);
  const path = pathOf(pair, chosen);

  useEffect(() => {
    // The address that a reader copies is the pair itself, with no `from`.
    if (window.location.search) window.history.replaceState(window.history.state, "", window.location.pathname);
    track("pair_opened", { from: cameFrom() ? "sheet" : "link", work: pair.work });
  }, [pair.work]);

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

  const back = from && pair[from];
  return (
    <>
      {back && <PairBack href={`${back.base}${back.hash}`} label={back.shortRef} />}
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
