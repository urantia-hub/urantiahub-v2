"use client";

import { useMemo, useState } from "react";
import { track } from "@/analytics";
import { BOOKMARK_PATH } from "@/brand/BookmarkMark";
import { Icon } from "@/components/icons";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { units } from "@/image/compose";
import { hasShareSheet, shareParagraph } from "@/reader/share";
import { cutWords, sharePath, unitWords } from "@/reader/share-link";
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
  lang?: Lang;
};

// A link to one paragraph, or to the sentences of it that the reader chose. The card below the sentences
// is what a chat app shows for the link, and it changes with the choice.
export default function ShareSheet({ reference, paperTitle, text, onClose, onCopied, onImage, lang = "en" }: Props) {
  const t = messages(lang);
  const all = useMemo(() => units(text), [text]);
  // A text with a clause names its parts; a text of whole sentences names sentences, as before.
  const clauses = all.some((u) => !u.first || !u.last);
  const [chosen, setChosen] = useState<ReadonlySet<number>>(new Set());
  const [note, setNote] = useState<string | null>(null);
  const [withSheet] = useState(hasShareSheet);

  const whole = chosen.size === 0 || chosen.size >= all.length;
  const words = unitWords(text, chosen);
  const shown = cutWords(words, 300);
  const path = sharePath(reference, chosen, all, lang);
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
      if (!sheet) setNote(t.shareFailed);
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
          {t.shareCopy}
        </button>
        {withSheet && (
          <button type="button" className="panel-button dark" onClick={() => void send(true)}>
            <Icon name="share" />
            {t.shareSend}
          </button>
        )}
      </div>
      <button type="button" className="share-third" onClick={() => onImage(whole ? new Set() : chosen)}>
        {t.shareImage}
      </button>
    </>
  );
  return (
    <Sheet label={t.shareTitle(reference)} onClose={onClose} className="share" close closeLabel={t.close} foot={foot}>
      <h2>{t.shareTitle(reference)}</h2>
      <p className="share-sub">{all.length > 1 ? t.sharePick(clauses) : t.shareOne}</p>
      <div className="share-cols">
        {all.length > 1 && (
          <div>
            <div className="share-pickwrap">
              <p className="share-pick" data-all={chosen.size === 0 ? "" : undefined}>
                {all.map((unit, i) => (
                  <button type="button" key={i} aria-pressed={chosen.has(i)} onClick={() => toggle(i)}>
                    {unit.text}{" "}
                  </button>
                ))}
              </p>
            </div>
            <div className="share-count">
              <span role="status">{whole ? t.shareWhole : t.shareCount(chosen.size, all.length, clauses)}</span>
              {chosen.size > 0 && (
                <button type="button" onClick={() => setChosen(new Set())}>
                  {t.shareWholeButton}
                </button>
              )}
            </div>
          </div>
        )}
        <div>
          <p className="share-label">{t.shareLooks}</p>
          <div className="share-card">
            {/* The picture of the link is light in each theme: it is one file for each chat app. */}
            <div className="share-og" data-size={shown.length < 90 ? "s" : shown.length <= 190 ? "m" : "l"}>
              <q>{shown}</q>
              <div>
                <svg viewBox="0 0 64 64" aria-hidden="true">
                  <rect width="64" height="64" rx="13" />
                  <path d={BOOKMARK_PATH} />
                </svg>
                {t.thePapers}<span>{reference}</span>
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
