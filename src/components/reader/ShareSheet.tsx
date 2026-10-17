"use client";

import { useMemo, useState } from "react";
import { track } from "@/analytics";
import { BOOKMARK_PATH } from "@/brand/BookmarkMark";
import { Icon } from "@/components/icons";
import { sentences } from "@/image/compose";
import { hasShareSheet, shareParagraph } from "@/reader/share";
import { cutWords, sharePath, sharedWords } from "@/reader/share-link";
import { Sheet } from "./Sheet";
import { earnToolMark } from "@/streak/client";

type Props = {
  reference: string;
  paperTitle: string;
  text: string;
  onClose: () => void;
  // The link is in the clipboard. The controls of the paper say so.
  onCopied: () => void;
  onImage: (chosen: ReadonlySet<number>) => void;
};

// A link to one paragraph, or to the sentences of it that the reader chose. The card below the sentences
// is what a chat app shows for the link, and it changes with the choice.
export default function ShareSheet({ reference, paperTitle, text, onClose, onCopied, onImage }: Props) {
  const all = useMemo(() => sentences(text), [text]);
  const [chosen, setChosen] = useState<ReadonlySet<number>>(new Set());
  const [note, setNote] = useState<string | null>(null);
  const [withSheet] = useState(hasShareSheet);

  const whole = chosen.size === 0 || chosen.size >= all.length;
  const words = sharedWords(text, chosen);
  const shown = cutWords(words, 300);
  const path = sharePath(reference, chosen, all.length);
  const title = `${reference} · ${paperTitle}`;
  const host = window.location.host.replace(/^www\./, "");

  const toggle = (i: number) =>
    setChosen((was) => {
      const next = new Set(was);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  async function send(sheet: boolean) {
    const method = await shareParagraph({ title, url: `${window.location.origin}${path}` }, navigator, sheet);
    if (method === "none") {
      // The reader closed the share sheet of the device, or the browser refused the clipboard.
      if (!sheet) setNote("The link did not copy. Select the address above, then copy it.");
      return;
    }
    track("paragraph_shared", { ref: reference, method, part: !whole });
    void earnToolMark("share");
    if (method === "copy") onCopied();
  }

  // The actions keep their place below the sentences and the card, so a short screen never hides them.
  const foot = (
    <>
      <div className="share-acts">
        <button type="button" className={`panel-button${withSheet ? "" : " dark"}`} onClick={() => void send(false)}>
          <Icon name="copy" />
          Copy link
        </button>
        {withSheet && (
          <button type="button" className="panel-button dark" onClick={() => void send(true)}>
            <Icon name="share" />
            Share link
          </button>
        )}
      </div>
      <button type="button" className="share-third" onClick={() => onImage(whole ? new Set() : chosen)}>
        Make an image of these words
      </button>
    </>
  );
  return (
    <Sheet label={`Share ${reference}`} onClose={onClose} className="share" close foot={foot}>
      <h2>Share {reference}</h2>
      <p className="share-sub">{all.length > 1 ? "Press each sentence that you want. With none chosen, the link is for the whole paragraph." : "The link opens this paragraph in its paper."}</p>
      <div className="share-cols">
        {all.length > 1 && (
          <div>
            <div className="share-pickwrap">
              <p className="share-pick" data-all={chosen.size === 0 ? "" : undefined}>
                {all.map((sentence, i) => (
                  <button type="button" key={i} aria-pressed={chosen.has(i)} onClick={() => toggle(i)}>
                    {sentence}{" "}
                  </button>
                ))}
              </p>
            </div>
            <div className="share-count">
              <span role="status">{whole ? "The whole paragraph" : `${chosen.size} of ${all.length} sentences`}</span>
              {chosen.size > 0 && (
                <button type="button" onClick={() => setChosen(new Set())}>
                  Whole paragraph
                </button>
              )}
            </div>
          </div>
        )}
        <div>
          <p className="share-label">How the link looks</p>
          <div className="share-card">
            {/* The picture of the link is light in each theme: it is one file for each chat app. */}
            <div className="share-og" data-size={shown.length < 90 ? "s" : shown.length <= 190 ? "m" : "l"}>
              <q>{shown}</q>
              <div>
                <svg viewBox="0 0 64 64" aria-hidden="true">
                  <rect width="64" height="64" rx="13" />
                  <path d={BOOKMARK_PATH} />
                </svg>
                The Urantia Papers<span>{reference}</span>
              </div>
            </div>
            <div className="share-meta">
              <b>{title}</b>
              <span>“{cutWords(words, 180)}”</span>
              <small>{host}</small>
            </div>
          </div>
          <p className="share-url" data-testid="share-url">
            {host}
            {path}
          </p>
          {note && (
            <p className="share-note" role="status">
              {note}
            </p>
          )}
        </div>
      </div>
    </Sheet>
  );
}
