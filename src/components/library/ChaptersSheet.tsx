"use client";

import Link from "next/link";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icons";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { textsHref } from "@/i18n/paths";
import { useLeave } from "@/lib/use-leave";
import { useMoreBelow } from "@/lib/use-more-below";

export type ChapterRow = { key: string; number: string | null; title: string; count: string };
type Props = { work: { slug: string; title: string; summary: string }; pages: ChapterRow[]; current: string; grid?: boolean; onClose: () => void; lang?: Lang };

// The pages of a work, the current one marked, and the way back to all the works. It has the frame of the
// parallels: a sheet on a phone, a card in the right margin on a wide screen.
export function ChaptersSheet({ work, pages, current, grid = false, onClose, lang = "en" }: Props) {
  const t = messages(lang).texts;
  const scroll = useMoreBelow<HTMLDivElement>();
  const box = scroll.ref;
  const { leaving, leave } = useLeave(onClose);

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
      <div className="terms-sheet chapters" role="dialog" aria-label={t.chapters} tabIndex={-1} data-leaving={leaving ? "" : undefined} {...scroll}>
        <button type="button" className="terms-close" aria-label={t.closeChapters} onClick={leave}>
          <Icon name="close" />
        </button>
        <h2 className="terms-title">{work.title}</h2>
        {work.summary && <p className="parallel-lead">{work.summary}</p>}
        {grid ? (
          // A page with no title shows as its number; its full name is for a screen reader.
          <ul className="chapter-grid">
            {pages.map((p) => (
              <li key={p.key}>
                <Link href={textsHref(lang, work.slug, p.key)} aria-label={p.title} aria-current={p.key === current ? "page" : undefined} onClick={onClose}>
                  {p.number ?? p.title}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="chapter-list">
            {pages.map((p) => (
              <li key={p.key}>
                <Link href={textsHref(lang, work.slug, p.key)} aria-current={p.key === current ? "page" : undefined} onClick={onClose}>
                  {p.number && <span className="n">{p.number}</span>}
                  <span className="t">{p.title}</span>
                  <small>{p.count}</small>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link className="parallel-more" href={textsHref(lang, work.slug)} onClick={onClose}>
          {t.aboutWork}
        </Link>
      </div>
    </>,
    document.body,
  );
}
