"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { track } from "@/analytics";
import { Icon } from "@/components/icons";
import { changeLines, type Part, type TextChange } from "@/editions/changes";
import { messages } from "@/i18n/messages";
import { useLeave } from "@/lib/use-leave";
import { useMoreBelow } from "@/lib/use-more-below";

// The page of Urantia Foundation's list of corrections, where each reason comes from.
export const CORRECTIONS_URL = "https://www.urantia.org/urantia-book/text-standardization#adopted-corrections";

type Props = { reference: string; paperId: string; changes: TextChange[]; onClose: () => void };

const words = (parts: Part[], tag: "del" | "ins") =>
  parts.map((part, i) => (part.changed ? (tag === "del" ? <del key={i}>{part.text}</del> : <ins key={i}>{part.text}</ins>) : part.text));

// The changes to the words of one paragraph since the first printing of 1955. The data is in the page,
// so the sheet asks for nothing. It has the place of the terms: a sheet on a phone, a card on a wide screen.
export default function ChangesSheet({ reference, paperId, changes, onClose }: Props) {
  const t = messages("en");
  const scroll = useMoreBelow<HTMLDivElement>();
  const box = scroll.ref;
  const { leaving, leave } = useLeave(onClose);

  useEffect(() => {
    track("changes_opened", { paper_id: paperId, count: changes.length });
  }, [reference, paperId, changes.length]);

  useEffect(() => {
    box.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      leave();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [box, leave]);

  return createPortal(
    <>
      <div className="terms-scrim" data-leaving={leaving ? "" : undefined} onClick={leave} />
      <div className="terms-sheet parallels changes" role="dialog" aria-label={t.changesTitle} tabIndex={-1} data-leaving={leaving ? "" : undefined} {...scroll}>
        <button type="button" className="terms-close" aria-label={t.changesClose} onClick={leave}>
          <Icon name="close" />
        </button>
        <h2 className="terms-title">{t.changesTitle}</h2>
        <p className="parallel-lead">{t.changesLead(changes.length)}</p>
        <ol className="change-list">
          {changes.map((change, i) => {
            const lines = changeLines(change.before, change.after);
            return (
              <li key={i}>
                <p className="change-year">{t.changesYear(change.year)}</p>
                <p className="change-line was">
                  <b>{t.changesWas}</b>
                  <span>{words(lines.was, "del")}</span>
                </p>
                <p className="change-line">
                  <b>{t.changesNow}</b>
                  <span>{words(lines.now, "ins")}</span>
                </p>
                {change.reason && <p className="change-why">{change.reason}</p>}
              </li>
            );
          })}
        </ol>
        {changes.some((c) => c.reason) && (
          <p className="change-source">
            {t.changesSource.before}
            <a href={CORRECTIONS_URL} target="_blank" rel="noopener noreferrer">
              {t.changesSource.link}
            </a>
            {t.changesSource.after}
          </p>
        )}
      </div>
    </>,
    document.body,
  );
}
