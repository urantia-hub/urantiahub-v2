"use client";

import { useState } from "react";
import { track } from "@/analytics";
import { BOOKMARK_PATH } from "@/brand/BookmarkMark";
import { Icon } from "@/components/icons";
import { Sheet } from "@/components/reader/Sheet";
import { messages } from "@/i18n/messages";
import { hasShareSheet, shareParagraph } from "@/reader/share";
import { earnToolMark } from "@/streak/client";
import { cardQuote, type Chosen, pairSize, pathOf, type ViewPair, type ViewSide, wordsOf } from "./view";

type Props = {
  pair: ViewPair;
  chosen: Chosen;
  // A press on a unit. The page holds the choice, so the page, the card, and the address show one choice.
  onChoose: (side: "a" | "b", i: number) => void;
  onClose: () => void;
  onCopied: () => void;
};

// The card of a side on the picture of the link.
const CardSide = ({ side, quote }: { side: ViewSide; quote: string }) => (
  <div className="pair-og-side">
    <span className="pair-og-eyebrow">{side.card}</span>
    <span className="pair-og-kind">{side.kind ?? " "}</span>
    <q>“{quote.replace(/^“/, "")}”</q>
    <span className="pair-og-ref">{side.shortRef}</span>
  </div>
);

// A link to two passages, with the units of each that the reader chose. The card is what a chat app shows.
export default function PairShareSheet({ pair, chosen, onChoose, onClose, onCopied }: Props) {
  const [note, setNote] = useState<string | null>(null);
  const [withSheet] = useState(hasShareSheet);
  const path = pathOf(pair, chosen);
  const t = messages(pair.lang ?? "en");
  const host = window.location.host.replace(/^www\./, "");
  const quotes = { a: cardQuote(wordsOf(pair.a, chosen.a)), b: cardQuote(wordsOf(pair.b, chosen.b)) };
  const size = pairSize(Math.max(quotes.a.length, quotes.b.length));
  const part = (["a", "b"] as const).some((k) => chosen[k].size > 0 && chosen[k].size < pair[k].units.length);

  async function send(sheet: boolean) {
    const method = await shareParagraph({ title: `${pair.a.shortRef} and ${pair.b.shortRef}`, url: `${window.location.origin}${path}` }, navigator, sheet);
    if (method === "none") {
      if (!sheet) setNote(t.shareFailed);
      return;
    }
    track("pair_shared", { work: pair.work, method, part });
    void earnToolMark("share");
    if (method === "copy") {
      setNote(t.linkCopied);
      onCopied();
    }
  }

  const foot = (
    <>
      <p className="share-url" data-testid="share-url">
        {host}
        {path}
      </p>
      {note && (
        <p className="share-note" role="status">
          {note}
        </p>
      )}
      <div className="share-acts">
        <button type="button" className={`panel-button${withSheet ? "" : " dark"}`} onClick={() => void send(false)}>
          <Icon name="copy" />
          {t.shareCopy}
        </button>
        {withSheet && (
          <button type="button" className="panel-button dark" onClick={() => void send(true)}>
            <Icon name="share" />
            {t.shareSend}
          </button>
        )}
      </div>
    </>
  );
  return (
    <Sheet label={t.pair.shareTitle} onClose={onClose} className="share pair-share" close foot={foot}>
      <h2>{t.pair.shareTitle}</h2>
      <p className="share-sub">{t.pair.shareSub}</p>
      <div className="share-card">
        {/* The picture of the link is light in each theme: it is one file for each chat app. */}
        <div className="pair-og" style={{ "--q": `${(size / 1200) * 100}cqw` } as React.CSSProperties}>
          <div className="pair-og-cols">
            <CardSide side={pair.a} quote={quotes.a} />
            <CardSide side={pair.b} quote={quotes.b} />
          </div>
          <div className="pair-og-foot">
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <rect width="64" height="64" rx="13" />
              <path d={BOOKMARK_PATH} />
            </svg>
            {t.pair.twoPassages}
          </div>
        </div>
      </div>
      {(["a", "b"] as const).map((k) => {
        const side = pair[k];
        const some = chosen[k].size > 0 && chosen[k].size < side.units.length;
        return (
          <div className="pair-share-side" key={k}>
            <p className="share-label">
              {side.eyebrow} · {side.shortRef}
              <span>{some ? t.pair.ofCount(chosen[k].size, side.units.length) : t.pair.whole}</span>
            </p>
            <div className="share-pickwrap">
              <p className="share-pick" data-all={some ? undefined : ""}>
                {side.units.map((unit, i) => (
                  <button type="button" key={i} aria-pressed={chosen[k].has(i)} onClick={() => onChoose(k, i)}>
                    {unit.text}{" "}
                  </button>
                ))}
              </p>
            </div>
          </div>
        );
      })}
    </Sheet>
  );
}
