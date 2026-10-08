"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { track } from "@/analytics";
import { Icon } from "@/components/icons";
import { searchHref } from "@/search/query";
import type { Term, TermsAnswer } from "@/server/terms";

type Props = { reference: string; paperId: string; onClose: () => void };
type State = { for: string; status: "loading" } | { for: string; status: "failed" } | { for: string; status: "ready"; answer: TermsAnswer };

const range = (n: number, small: number, a: string, b: string) => (n === 0 ? "0" : n <= small ? a : b);

// The glossary terms that stand in one paragraph. It opens at once and shows grey rows while the list loads.
// The list brings each description, so an entry opens with no second request.
export function TermsSheet({ reference, paperId, onClose }: Props) {
  const [state, setState] = useState<State>({ for: reference, status: "loading" });
  const [open, setOpen] = useState<Term | null>(null);
  const [attempt, setAttempt] = useState(0);
  const box = useRef<HTMLDivElement>(null);

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
    fetch(`/api/terms/${encodeURIComponent(reference)}`, { signal: control.signal })
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
  }, [reference, paperId, attempt]);

  // The focus stays in the sheet: at the start, when an entry opens, and when the list returns.
  // Each of those removes the control that had the focus.
  useEffect(() => {
    box.current?.focus({ preventScroll: true });
  }, [open]);

  const onKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Escape closes the terms and stops there. The paragraph stays marked.
      event.preventDefault();
      onClose();
    },
    [onClose],
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
    <div className="terms-sheet" role="dialog" aria-label={`Terms in ${reference}`} tabIndex={-1} ref={box}>
      <button type="button" className="terms-close" aria-label="Close the terms" onClick={onClose}>
        <Icon name="close" />
      </button>

      {open ? (
        <div className="term-entry">
          <button type="button" className="terms-back" aria-label="Back to the terms" onClick={() => setOpen(null)}>
            <Icon name="paperBefore" />
            Terms in {reference}
          </button>
          <p className="terms-kind">{open.kind}</p>
          <h2>{open.name}</h2>
          <p className="term-text">{open.description}</p>
          {open.aliases.length > 0 && (
            <p className="term-more">
              <b>Also called:</b> {open.aliases.join(", ")}
            </p>
          )}
          {open.seeAlso.length > 0 && (
            <p className="term-more">
              <b>See also:</b> {open.seeAlso.join(", ")}
            </p>
          )}
          <Link className="term-places" prefetch={false} href={searchHref(open.name)}>
            Each place in the Papers
            <span>{open.citations}</span>
            <Icon name="paperAfter" />
          </Link>
        </div>
      ) : (
        <>
          <h2 className="terms-title">Terms in {reference}</h2>
          {state.status === "loading" && (
            <div className="waiting" role="status" aria-label="Loading the terms">
              <span />
              <span />
              <span />
            </div>
          )}
          {state.status === "failed" && (
            <p className="terms-empty" role="alert">
              The terms did not load.{" "}
              <button type="button" onClick={retry}>
                Try again
              </button>
            </p>
          )}
          {state.status === "ready" && state.answer.names.length + state.answer.ideas.length === 0 && (
            <p className="terms-empty">No glossary term stands in this paragraph.</p>
          )}
          {state.status === "ready" && (
            <div className="terms-list">
              {group("Names", state.answer.names)}
              {group("Ideas", state.answer.ideas)}
            </div>
          )}
        </>
      )}
    </div>,
    document.body,
  );
}
