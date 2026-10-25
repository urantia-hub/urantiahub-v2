"use client";

import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { track } from "@/analytics";
import { Icon } from "@/components/icons";
import { messages } from "@/i18n/messages";
import { PairBack } from "./PairBack";
import { PairQuote } from "./PairQuotes";
import { type Chosen, pathOf, targetOf, type ViewPair, wordsOf } from "./view";

const PairShareSheet = lazy(() => import("./PairShareSheet"));

// The side of the parallels sheet that the reader came from: `?from=` on arrival, then kept in the history entry,
// so a later change of the address, and Back and Forward, keep the back link.
function cameFrom(): "a" | "b" | null {
  const kept = (window.history.state as { pairFrom?: unknown } | null)?.pairFrom;
  if (kept === "a" || kept === "b") return kept;
  const from = new URLSearchParams(window.location.search).get("from");
  return from === "paper" ? "a" : from === "text" ? "b" : null;
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
    const side = cameFrom();
    if (window.location.search) window.history.replaceState({ ...window.history.state, pairFrom: side }, "", window.location.pathname);
    track("pair_opened", { from: side ? "sheet" : "link", work: pair.work });
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
  const lang = pair.lang ?? "en";
  const t = messages(lang);
  const english = lang !== "en";
  return (
    <>
      {back && <PairBack href={`${back.base}${back.hash}`} label={back.shortRef} />}
      <div className="pair-cols">
        <PairQuote href={targetOf(pair.a, chosen.a)} eyebrow={pair.a.eyebrow} kind={null} words={wordsOf(pair.a, chosen.a)} source={pair.a.source} go={t.pair.readPaper} showAll={t.pair.showAll} />
        <div className="pair-and">{t.pair.and}</div>
        <PairQuote
          href={targetOf(pair.b, chosen.b)}
          eyebrow={pair.b.eyebrow}
          kind={pair.b.kind}
          words={wordsOf(pair.b, chosen.b)}
          source={pair.b.source}
          go={t.pair.readText}
          showAll={t.pair.showAll}
          english={english}
          note={english ? t.texts.englishText : undefined}
        />
      </div>
      <div className="pair-acts">
        <button type="button" className="pair-share-button" onClick={() => setOpen(true)}>
          <Icon name="share" />
          {t.share}
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
