"use client";

import Link from "next/link";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icons";
import { useLeave } from "@/lib/use-leave";
import { useMoreBelow } from "@/lib/use-more-below";

export type ChapterRow = { key: string; number: string | null; title: string; count: string };
type Props = { work: { slug: string; title: string; summary: string }; pages: ChapterRow[]; current: string; onClose: () => void };

// The pages of a work, the current one marked, and the way back to all the works. It has the frame of the
// parallels: a sheet on a phone, a card in the right margin on a wide screen.
export function ChaptersSheet({ work, pages, current, onClose }: Props) {
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
      <div className="terms-sheet chapters" role="dialog" aria-label="Chapters" tabIndex={-1} data-leaving={leaving ? "" : undefined} {...scroll}>
        <button type="button" className="terms-close" aria-label="Close the chapters" onClick={leave}>
          <Icon name="close" />
        </button>
        <h2 className="terms-title">{work.title}</h2>
        {work.summary && <p className="parallel-lead">{work.summary}</p>}
        <ul className="chapter-list">
          {pages.map((p) => (
            <li key={p.key}>
              <Link href={`/library/${work.slug}/${p.key}`} aria-current={p.key === current ? "page" : undefined} onClick={onClose}>
                {p.number && <span className="n">{p.number}</span>}
                <span className="t">{p.title}</span>
                <small>{p.count}</small>
              </Link>
            </li>
          ))}
        </ul>
        <Link className="parallel-more" href="/library" onClick={onClose}>
          All the works in the Library
        </Link>
      </div>
    </>,
    document.body,
  );
}
