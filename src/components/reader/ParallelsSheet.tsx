"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { track } from "@/analytics";
import { Icon } from "@/components/icons";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { textsHref } from "@/i18n/paths";
import { Score } from "@/components/parallels/Score";
import { useLeave } from "@/lib/use-leave";
import { useMoreBelow } from "@/lib/use-more-below";
import type { Parallel, ParallelsAnswer } from "@/server/parallels";
import { LIBRARY_LINKS } from "@/library/flags";
import { earnToolMark } from "@/streak/client";

// `onGo` tells the controls of the paper that a passage of this paper opens: a link to the same page
// with another "#" sends no event that they hear.
// With `work`, the reference is a passage of that work in the Library: its parallels come from another
// address, and "In the Papers" comes first.
// `lang` is the language of the paragraph. A passage of a work in World texts is in English.
type Props = { reference: string; paperId: string; work?: string; onClose: () => void; onGo?: (reference: string) => void; lang?: Lang };
type Half = "outside" | "papers";
// The answer for a passage also names its chunk (`label`) and has a list below the floor for the Papers.
type Answer = ParallelsAnswer & { label?: string; weakerPapers?: Parallel[]; source?: string; href?: string | null };
type State = { for: string; status: "loading" } | { for: string; status: "failed" } | { for: string; status: "ready"; answer: Answer };

const FIRST = 8;
const LONG = 170;
const range = (n: number) => (n === 0 ? "0" : n <= 5 ? "1-5" : "6+");

// The passages that are near in meaning to one paragraph, in two halves: the other works, and the Papers.
// It has the place of the terms: a sheet on a phone, a card in the right margin on a wide screen.
export default function ParallelsSheet({ reference, paperId, work, onClose, onGo, lang = "en" }: Props) {
  const t = messages(lang);
  const [state, setState] = useState<State>({ for: reference, status: "loading" });
  const [half, setHalf] = useState<Half>(work ? "papers" : "outside");
  const halves: [Half, string][] = work ? [["papers", t.parPapers], ["outside", t.parOther]] : [["outside", t.parOther], ["papers", t.parPapers]];
  // Each event of a passage says so; the events of a paragraph stay as they were.
  const from = work ? { source: "passage" } : {};
  const endpoint = `${work ? `/api/parallels/texts/${encodeURIComponent(work)}/${encodeURIComponent(reference)}` : `/api/parallels/${encodeURIComponent(reference)}`}${lang === "es" ? "?lang=es" : ""}`;
  const [all, setAll] = useState(false);
  // The reader asked for the passages below the floor.
  const [weak, setWeak] = useState(false);
  // The reader asked for the passages of this paper and the papers beside it.
  const [close, setClose] = useState(false);
  const [whole, setWhole] = useState<ReadonlySet<string>>(new Set());
  const [attempt, setAttempt] = useState(0);
  const scroll = useMoreBelow<HTMLDivElement>();
  const box = scroll.ref;
  const { leaving, leave } = useLeave(onClose);

  // The mark moved to another paragraph: the sheet follows it.
  if (state.for !== reference) {
    setState({ for: reference, status: "loading" });
    setAll(false);
    setWeak(false);
    setClose(false);
    setWhole(new Set());
  }

  useEffect(() => {
    let current = true;
    const control = new AbortController();
    const timer = window.setTimeout(() => control.abort(), 8000);
    fetch(endpoint, { signal: control.signal })
      .then((res) => (res.ok ? (res.json() as Promise<Answer>) : Promise.reject(new Error(String(res.status)))))
      .then((answer) => {
        if (!current) return;
        setState({ for: reference, status: "ready", answer });
        void earnToolMark("parallels");
        track("parallels_opened", { paper_id: paperId, outside: range(answer.outside.length), papers: range(answer.papers.length), nearby: range(answer.nearby?.length ?? 0), ...(work ? { source: "passage" } : {}) });
      })
      .catch(() => {
        if (current) setState({ for: reference, status: "failed" });
      })
      .finally(() => window.clearTimeout(timer));
    return () => {
      current = false;
      window.clearTimeout(timer);
      control.abort();
    };
  }, [reference, paperId, attempt, endpoint, work]);

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

  function choose(next: Half) {
    if (next === half) return;
    setHalf(next);
    setAll(false);
    setClose(false);
    track("parallels_tab", { tab: next, ...from });
  }

  const near = state.status === "ready" ? state.answer[half] : [];
  // An answer that a cache kept from before can have no `weaker`.
  const below = (answer: Answer) => (half === "outside" ? (answer.weaker ?? []) : work ? (answer.weakerPapers ?? []) : []);
  const weaker = state.status === "ready" && near.length === 0 ? below(state.answer) : [];
  // A passage with no other work near, even below the floor, has one half: it shows as a plain heading.
  const oneHalf = work !== undefined && state.status === "ready" && state.answer.outside.length === 0 && (state.answer.weaker ?? []).length === 0;
  const title = t.parTitle((state.status === "ready" && state.answer.label) || reference);
  const list = weak && near.length === 0 ? weaker : near;
  const shown = all ? list : list.slice(0, FIRST);
  // An answer that a cache kept from before has no `nearby`: then its list of the Papers stands as it was.
  // A passage of a work has no paper, so its list of the Papers is one list.
  const split = !work && state.status === "ready" && half === "papers" && state.answer.nearby !== undefined;
  const nearby = split ? state.answer.nearby : [];

  const item = (p: Parallel) => {
    const key = `${half}:${p.ref}`;
    const long = p.text.length > LONG;
    const open = whole.has(key);
    const opened = () => track("parallel_opened", { kind: half, ...from });
    const more = long && (
      <button type="button" aria-expanded={open} onClick={() => setWhole((was) => new Set(open ? [...was].filter((k) => k !== key) : [...was, key]))}>
        {open ? t.parShowLess : t.parReadMore}
      </button>
    );
    // A near passage of a work in World texts opens the page of the two passages. The whole row is its link:
    // the link covers the row, and the score and "Read more" stay buttons above it.
    if (p.pairPath)
      return (
        <li key={key} className="parallel-paired">
          <div className="parallel-where">
            <Link className="parallel-pair" href={`${p.pairPath}?from=${work ? "text" : "paper"}`} prefetch={false} onClick={opened}>
              <b>{p.ref}</b>
              <span className="sr-only">, beside this passage</span>
            </Link>
            <small>{p.source}</small>
            <Score percent={p.percent} lang={lang} />
          </div>
          <p className={long && !open ? "clamp" : undefined}>{p.text}</p>
          {more && <div className="parallel-acts">{more}</div>}
        </li>
      );
    return (
      <li key={key}>
        <div className="parallel-where">
          <b>{p.ref}</b>
          <small>
            {p.source}
            {p.english && <span className="parallel-lang">{t.parEnglish}</span>}
          </small>
          <Score percent={p.percent} lang={lang} />
        </div>
        <p className={long && !open ? "clamp" : undefined} lang={p.english ? "en" : undefined}>
          {p.text}
        </p>
        <div className="parallel-acts">
          {more}
          {LIBRARY_LINKS && half === "outside" && p.library && (
            <Link className="parallel-open" href={`${textsHref(lang, p.library.slug)}/at/${encodeURIComponent(p.library.ref)}`} prefetch={false} onClick={opened}>
              {t.parReadHere}
              <span className="sr-only"> {p.ref}</span>
              <Icon name="paperAfter" />
            </Link>
          )}
          {/* A passage of the Papers is a page of this site. Another work opens beside it, so the reader keeps the place. */}
          {p.href !== null &&
            (half === "papers" ? (
              <Link
                className="parallel-open"
                href={p.href}
                prefetch={false}
                onClick={() => {
                  opened();
                  onGo?.(p.ref);
                }}
              >
                {t.parOpen}
                <span className="sr-only"> {p.ref}</span>
                <Icon name="paperAfter" />
              </Link>
            ) : (
              <a className="parallel-open" href={p.href} target="_blank" rel="noopener noreferrer" onClick={opened}>
                {t.parOpen}
                <span className="sr-only">
                  {" "}
                  {p.ref} {t.parNewTab}
                </span>
                <Icon name="external" />
              </a>
            ))}
        </div>
      </li>
    );
  };

  return createPortal(
    <>
    {/* On a phone the sheet covers the text: the text behind it is darker, and a tap there closes the sheet. */}
    <div className="terms-scrim" data-leaving={leaving ? "" : undefined} onClick={leave} />
    <div className="terms-sheet parallels" role="dialog" aria-label={title} tabIndex={-1} data-leaving={leaving ? "" : undefined} {...scroll}>
      <button type="button" className="terms-close" aria-label={t.parClose} onClick={leave}>
        <Icon name="close" />
      </button>
      <h2 className="terms-title">{title}</h2>
      <p className="parallel-lead">{t.parLead}</p>
      {work && state.status === "ready" && state.answer.source && (
        <p className="parallel-source">
          <span>{state.answer.source}</span>
          {state.answer.href && (
            <a href={state.answer.href} target="_blank" rel="noopener noreferrer">
              Read at the source
              <span className="sr-only"> (opens in a new tab)</span>
              <Icon name="external" />
            </a>
          )}
        </p>
      )}
      {/* Two halves of one control, as the theme in the reader settings. */}
      {oneHalf ? (
        <p className="terms-group">{t.parPapers}</p>
      ) : (
        <div className="segment parallel-halves" role="group" aria-label={t.parWorks}>
          {halves.map(([value, label]) => (
            <button type="button" key={value} aria-pressed={half === value} onClick={() => choose(value)}>
              {label}
            </button>
          ))}
        </div>
      )}

      {state.status === "loading" && (
        <div className="waiting" role="status" aria-label={t.parLoading}>
          <span />
          <span />
          <span />
        </div>
      )}
      {state.status === "failed" && (
        <p className="terms-empty" role="alert">
          {t.parFailed}{" "}
          <button type="button" onClick={() => { setState({ for: reference, status: "loading" }); setAttempt((n) => n + 1); }}>
            {t.tryAgain}
          </button>
        </p>
      )}
      {split && <p className="terms-group">{t.parElsewhere}</p>}
      {state.status === "ready" && near.length === 0 && (
        <p className="terms-empty">
          {half === "outside" ? t.parNoneOther : nearby.length > 0 ? t.parNoneElsewhere : t.parNonePapers}
        </p>
      )}
      {weaker.length > 0 && !weak && (
        <button
          type="button"
          className="parallel-weaker"
          onClick={() => {
            setWeak(true);
            track("parallels_weaker_shown", { paper_id: paperId, ...from });
          }}
        >
          {t.parWeaker}
        </button>
      )}
      {shown.length > 0 && <ul className="parallel-list">{shown.map(item)}</ul>}
      {list.length > shown.length && (
        <button type="button" className="parallel-more" onClick={() => setAll(true)}>
          {t.parShowMore(list.length - shown.length)}
        </button>
      )}
      {nearby.length > 0 && !close && (
        <button
          type="button"
          className="parallel-more"
          onClick={() => {
            setClose(true);
            track("parallels_nearby_shown", { paper_id: paperId });
          }}
        >
          {t.parShowNearby(nearby.length)}
        </button>
      )}
      {nearby.length > 0 && close && (
        <>
          <p className="terms-group">{t.parNearby}</p>
          <p className="parallel-near-note">{t.parNearbyNote(paperId)}</p>
          <ul className="parallel-list">{nearby.map(item)}</ul>
        </>
      )}
      {state.status === "ready" && !work && (
        <Link className="parallel-study" href={`${lang === "es" ? "/es/paralelos" : "/parallels"}?ref=${encodeURIComponent(reference)}`} prefetch={false}>
          {t.parStudy}
          <Icon name="paperAfter" />
        </Link>
      )}
    </div>
    </>,
    document.body,
  );
}
