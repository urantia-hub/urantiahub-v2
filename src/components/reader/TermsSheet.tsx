"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { track } from "@/analytics";
import { Icon } from "@/components/icons";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { searchHref } from "@/i18n/paths";
import { useLeave } from "@/lib/use-leave";
import { useMoreBelow } from "@/lib/use-more-below";
import type { Term, TermsAnswer } from "@/server/terms";
import { earnToolMark } from "@/streak/client";

type Props = { reference: string; paperId: string; lang?: Lang; onClose: () => void };
type State = { for: string; status: "loading" } | { for: string; status: "failed" } | { for: string; status: "ready"; answer: TermsAnswer };

const range = (n: number, small: number, a: string, b: string) => (n === 0 ? "0" : n <= small ? a : b);

// The glossary terms that stand in one paragraph. It opens at once and shows grey rows while the list loads.
// The list brings each description, so an entry opens with no second request.
export function TermsSheet({ reference, paperId, lang = "en", onClose }: Props) {
  const t = messages(lang);
  const [state, setState] = useState<State>({ for: reference, status: "loading" });
  const [open, setOpen] = useState<Term | null>(null);
  const [attempt, setAttempt] = useState(0);
  const scroll = useMoreBelow<HTMLDivElement>();
  const box = scroll.ref;
  const { leaving, leave } = useLeave(onClose);

  // A new paragraph starts again. React permits this change of state during a render.
  if (state.for !== reference) {
    setState({ for: reference, status: "loading" });
    setOpen(null);
  }

  useEffect(() => {
    let current = true;
    // A request that never ends must not leave the grey rows for ever.
    const control = new AbortController();
    const timer = window.setTimeout(() => control.abort(), 8000);
    fetch(`/api/terms/${encodeURIComponent(reference)}${lang === "es" ? "?lang=es" : ""}`, { signal: control.signal })
      .then((res) => (res.ok ? (res.json() as Promise<TermsAnswer>) : Promise.reject(new Error(String(res.status)))))
      .then((answer) => {
        // An answer for a paragraph that the reader left is dropped.
        if (!current) return;
        setState({ for: reference, status: "ready", answer });
        track("terms_opened", {
          paper_id: paperId,
          names: range(answer.names.length, 3, "1-3", "4+") as "0" | "1-3" | "4+",
          ideas: range(answer.ideas.length, 5, "1-5", "6+") as "0" | "1-5" | "6+",
        });
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
  }, [reference, paperId, lang, attempt]);

  // The focus stays in the sheet: at the start, when an entry opens, and when the list returns.
  // Each of those removes the control that had the focus.
  useEffect(() => {
    box.current?.focus({ preventScroll: true });
  }, [open, box]);

  const onKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Escape closes the terms and stops there. The paragraph stays marked.
      event.preventDefault();
      leave();
    },
    [leave],
  );
  useEffect(() => {
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onKey]);

  function retry() {
    setState({ for: reference, status: "loading" });
    setAttempt((n) => n + 1);
  }

  function show(term: Term) {
    track("term_opened", { kind: term.kind, term: term.id });
    void earnToolMark("terms");
    setOpen(term);
  }

  const group = (label: string, terms: Term[]) =>
    terms.length > 0 && (
      <>
        <h3 className="terms-group">{label}</h3>
        <ul aria-label={label}>
          {terms.map((term) => (
            <li key={term.id}>
              <button type="button" onClick={() => show(term)}>
                {term.name}
                <small>{term.kind}</small>
              </button>
            </li>
          ))}
        </ul>
      </>
    );

  return createPortal(
    <>
    <div className="terms-scrim" data-leaving={leaving ? "" : undefined} onClick={leave} />
    <div className="terms-sheet" role="dialog" aria-label={t.termsIn(reference)} tabIndex={-1} data-leaving={leaving ? "" : undefined} {...scroll}>
      <button type="button" className="terms-close" aria-label={t.termsClose} onClick={leave}>
        <Icon name="close" />
      </button>

      {open ? (
        <div className="term-entry">
          <button type="button" className="terms-back" aria-label={t.termsBack} onClick={() => setOpen(null)}>
            <Icon name="paperBefore" />
            {t.termsIn(reference)}
          </button>
          <p className="terms-kind">{open.kind}</p>
          <h2>{open.name}</h2>
          <p className="term-text">{open.description}</p>
          {open.aliases.length > 0 && (
            <p className="term-more">
              <b>{t.alsoCalled}</b> {open.aliases.join(", ")}
            </p>
          )}
          {open.seeAlso.length > 0 && (
            <p className="term-more">
              <b>{t.seeAlso}</b> {open.seeAlso.join(", ")}
            </p>
          )}
          <Link className="term-places" prefetch={false} href={searchHref(lang, open.name)}>
            {t.eachPlace}
            <span>{open.citations}</span>
            <Icon name="paperAfter" />
          </Link>
        </div>
      ) : (
        <>
          <h2 className="terms-title">{t.termsIn(reference)}</h2>
          {state.status === "loading" && (
            <div className="waiting" role="status" aria-label={t.termsLoading}>
              <span />
              <span />
              <span />
            </div>
          )}
          {state.status === "failed" && (
            <p className="terms-empty" role="alert">
              {t.termsFailed}{" "}
              <button type="button" onClick={retry}>
                {t.tryAgain}
              </button>
            </p>
          )}
          {state.status === "ready" && state.answer.names.length + state.answer.ideas.length === 0 && (
            <p className="terms-empty">{t.termsNone}</p>
          )}
          {state.status === "ready" && (
            <div className="terms-list">
              {group(t.termsNames, state.answer.names)}
              {group(t.termsIdeas, state.answer.ideas)}
            </div>
          )}
        </>
      )}
    </div>
    </>,
    document.body,
  );
}
