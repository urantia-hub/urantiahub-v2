"use client";

import Link from "next/link";
import { lazy, Suspense, useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { textsHref } from "@/i18n/paths";
import type { BookRow } from "@/library/bible";
import { BooksSheet } from "./BooksSheet";
import { NUMBERED } from "@/library/books";
import { saveTextPlace } from "@/library/text-places";
import { ChaptersSheet, type ChapterRow } from "./ChaptersSheet";
import { sharedPassageFromAddress } from "@/reader/share-link";

const ParallelsSheet = lazy(() => import("@/components/reader/ParallelsSheet"));

type Near = { key: string; title: string };
// A work in books (the Bible has 1,402 chapters) gives its books, and its previous and next page, in place of the rows.
type Props = {
  work: { slug: string; title: string; short: string; summary: string };
  pages: ChapterRow[];
  current: string;
  title: string;
  /** The line above the title ("Chapter 2"), kept with the place. A work of one page passes `place={false}`: it keeps none. */
  label?: string | null;
  place?: boolean;
  books?: { rows: BookRow[]; label: string; unit: string; current: { book: string; chapter: number } };
  previous?: Near;
  next?: Near;
  lang?: Lang;
};

// The passages are server HTML. A press on one marks it (`data-picked`, as on a paper page) and opens its parallels.
function mark(id: string | null) {
  document.querySelectorAll("[data-picked]").forEach((el) => el.removeAttribute("data-picked"));
  if (id) document.getElementById(id)?.setAttribute("data-picked", "");
}

const passageOf = (target: EventTarget | null) => (target instanceof Element ? target.closest<HTMLElement>(".paper.work p.para") : null);

// The controls of a work page: the dock with the previous and next page, the chapters, and the parallels.
export function WorkNav({ work, pages, current, title, label = null, place = true, books, lang = "en", ...near }: Props) {
  const t = messages(lang).texts;
  const [picked, setPicked] = useState<{ id: string; ref: string } | null>(null);
  const [chapters, setChapters] = useState(false);
  const at = pages.findIndex((p) => p.key === current);
  const previous = books ? near.previous : pages[at - 1];
  const next = books ? near.next : pages[at + 1];

  useEffect(() => mark(picked?.id ?? null), [picked]);

  // This page is the reader's place in the work: the page of the work offers to continue here.
  useEffect(() => {
    if (place) saveTextPlace(work.slug, { key: current, title, label });
  }, [place, work.slug, current, title, label]);

  // A passage named by the address ("In the Library" from a paper) is marked, brought into view, and opened.
  useEffect(() => {
    let first = true;
    const fromAddress = () => {
      // A pair link to some units, on the load only: `SharedMark` brings them into view with a soft mark, and the
      // passage has no mark. A later "#" on this page is a plain passage address.
      const units = first && sharedPassageFromAddress(window.location.search, window.location.hash) !== null;
      first = false;
      if (units) return;
      let id = "";
      try {
        id = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return;
      }
      const el = id ? document.getElementById(id) : null;
      if (!el?.matches(".paper.work p.para")) return;
      el.scrollIntoView({ block: "center" });
      setPicked({ id, ref: el.dataset.ref ?? id });
    };
    fromAddress();
    window.addEventListener("hashchange", fromAddress);
    return () => window.removeEventListener("hashchange", fromAddress);
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      // The list icon of the header opens the chapters of this work, not the list of all papers.
      if (event.target instanceof Element && event.target.closest(".site-header .contents-link")) {
        event.preventDefault();
        setChapters(true);
        return;
      }
      const passage = passageOf(event.target);
      if (!passage) return;
      event.preventDefault();
      setPicked((was) => (was?.id === passage.id ? null : { id: passage.id, ref: passage.dataset.ref ?? passage.id }));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return (
    <>
      <div className="dock" data-testid="reading-bar" data-job="reading">
        <div className="pill">
          <div className="row read">
            {previous ? (
              <Link className="arrow" href={textsHref(lang, work.slug, previous.key)} aria-label={t.previousOf(previous.title)}>
                <Icon name="paperBefore" />
              </Link>
            ) : (
              <span className="arrow" />
            )}
            <button type="button" className="where" aria-haspopup="dialog" aria-label={t.openWhere(work.short, title, Boolean(books))} onClick={() => setChapters(true)}>
              <small>{work.short}</small>
              <span>{title}</span>
            </button>
            {next ? (
              <Link className="arrow" href={textsHref(lang, work.slug, next.key)} aria-label={t.nextOf(next.title)}>
                <Icon name="paperAfter" />
              </Link>
            ) : (
              <span className="arrow" />
            )}
          </div>
        </div>
      </div>
      {chapters && !books && <ChaptersSheet work={work} pages={pages} current={current} grid={NUMBERED.has(work.slug)} onClose={() => setChapters(false)} lang={lang} />}
      {chapters && books && <BooksSheet work={work} books={books.rows} label={books.label} unit={books.unit} current={books.current} onClose={() => setChapters(false)} lang={lang} />}
      {picked && (
        <Suspense fallback={null}>
          <ParallelsSheet reference={picked.ref} paperId="" work={work.slug} onClose={() => setPicked(null)} lang={lang} />
        </Suspense>
      )}
    </>
  );
}
