"use client";

import Link from "next/link";
import { Sheet } from "@/components/reader/Sheet";

export type ChapterRow = { key: string; number: string | null; title: string; count: string };
type Props = { work: { slug: string; title: string; summary: string }; pages: ChapterRow[]; current: string; onClose: () => void };

// The pages of a work, the current one marked, and the way back to all the works.
export function ChaptersSheet({ work, pages, current, onClose }: Props) {
  return (
    <Sheet label="Chapters" onClose={onClose} className="chapters" close>
      <h2 className="terms-title">{work.title}</h2>
      {work.summary && <p className="parallel-lead">{work.summary}</p>}
      <ul className="terms-list chapter-list">
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
    </Sheet>
  );
}
