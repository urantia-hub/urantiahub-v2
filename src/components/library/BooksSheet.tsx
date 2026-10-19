"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icons";
import type { BookRow } from "@/library/bible";
import { useLeave } from "@/lib/use-leave";
import { useMoreBelow } from "@/lib/use-more-below";

type Props = { work: { title: string; summary: string }; books: BookRow[]; current: { book: string; chapter: number }; onClose: () => void };

// The books of the Bible in their parts, and the chapters of one book as numbers. It has the frame of the
// chapters sheet. The list opens at the current book.
export function BooksSheet({ work, books, current, onClose }: Props) {
  const scroll = useMoreBelow<HTMLDivElement>();
  const box = scroll.ref;
  const { leaving, leave } = useLeave(onClose);
  const [open, setOpen] = useState<BookRow | null>(null);
  const parts = books.map((b) => b.part).filter((p, i, all) => all.indexOf(p) === i);

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

  // The list starts at the current book; a book's chapters start at the top.
  useEffect(() => {
    const sheet = box.current;
    if (!sheet) return;
    const at = open ? null : sheet.querySelector<HTMLElement>("[aria-current]");
    sheet.scrollTo?.({ top: at ? at.offsetTop - sheet.clientHeight / 2 : 0 });
  }, [box, open]);

  return createPortal(
    <>
      <div className="terms-scrim" data-leaving={leaving ? "" : undefined} onClick={leave} />
      <div className="terms-sheet chapters" role="dialog" aria-label="The books of the Bible" tabIndex={-1} data-leaving={leaving ? "" : undefined} {...scroll}>
        <button type="button" className="terms-close" aria-label="Close the books" onClick={leave}>
          <Icon name="close" />
        </button>
        {open ? (
          <>
            <button type="button" className="book-back" onClick={() => setOpen(null)}>
              <Icon name="paperBefore" />
              All books
            </button>
            <h2 className="terms-title">{open.name}</h2>
            <p className="parallel-lead">{open.title}</p>
            <ul className="chapter-grid">
              {Array.from({ length: open.chapters }, (_, i) => i + 1).map((n) => (
                <li key={n}>
                  <Link href={`/texts/bible/${open.slug}-${n}`} aria-current={open.code === current.book && n === current.chapter ? "page" : undefined} onClick={onClose}>
                    {n}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <h2 className="terms-title">{work.title}</h2>
            {work.summary && <p className="parallel-lead">{work.summary}</p>}
            {parts.map((part) => (
              <section key={part}>
                <h3 className="terms-group">{part}</h3>
                <ul className="chapter-list">
                  {books
                    .filter((b) => b.part === part)
                    .map((b) => (
                      <li key={b.code}>
                        <button type="button" aria-current={b.code === current.book ? "true" : undefined} onClick={() => setOpen(b)}>
                          <span className="t">{b.name}</span>{" "}
                          <small>
                            {b.chapters} {b.chapters === 1 ? "chapter" : "chapters"}
                          </small>
                        </button>
                      </li>
                    ))}
                </ul>
              </section>
            ))}
            <Link className="parallel-more" href="/texts" onClick={onClose}>
              All world texts
            </Link>
          </>
        )}
      </div>
    </>,
    document.body,
  );
}
