"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { track } from "@/analytics";
import { Icon } from "@/components/icons";
import type { Parallel, ParallelsAnswer } from "@/server/parallels";

// `onGo` tells the controls of the paper that a passage of this paper opens: a link to the same page
// with another "#" sends no event that they hear.
type Props = { reference: string; paperId: string; onClose: () => void; onGo?: (reference: string) => void };
type Half = "outside" | "papers";
type State = { for: string; status: "loading" } | { for: string; status: "failed" } | { for: string; status: "ready"; answer: ParallelsAnswer };

const FIRST = 8;
const LONG = 170;
const range = (n: number) => (n === 0 ? "0" : n <= 5 ? "1-5" : "6+");
const HALVES: [Half, string][] = [["outside", "Other works"], ["papers", "In the Papers"]];

// The passages that are near in meaning to one paragraph, in two halves: the other works, and the Papers.
// It has the place of the terms: a sheet on a phone, a card in the right margin on a wide screen.
export default function ParallelsSheet({ reference, paperId, onClose, onGo }: Props) {
  const [state, setState] = useState<State>({ for: reference, status: "loading" });
  const [half, setHalf] = useState<Half>("outside");
  const [all, setAll] = useState(false);
  const [whole, setWhole] = useState<ReadonlySet<string>>(new Set());
  const [attempt, setAttempt] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);

  // The mark moved to another paragraph: the sheet follows it.
  if (state.for !== reference) {
    setState({ for: reference, status: "loading" });
    setAll(false);
    setWhole(new Set());
  }

  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    let current = true;
    const control = new AbortController();
    const timer = window.setTimeout(() => control.abort(), 8000);
    fetch(`/api/parallels/${encodeURIComponent(reference)}`, { signal: control.signal })
      .then((res) => (res.ok ? (res.json() as Promise<ParallelsAnswer>) : Promise.reject(new Error(String(res.status)))))
      .then((answer) => {
        if (!current) return;
        setState({ for: reference, status: "ready", answer });
        track("parallels_opened", { paper_id: paperId, outside: range(answer.outside.length), papers: range(answer.papers.length) });
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

  useEffect(() => {
    box.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close.current();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, []);

  function choose(next: Half) {
    if (next === half) return;
    setHalf(next);
    setAll(false);
    track("parallels_tab", { tab: next });
  }

  const list = state.status === "ready" ? state.answer[half] : [];
  const shown = all ? list : list.slice(0, FIRST);

  const item = (p: Parallel) => {
    const key = `${half}:${p.ref}`;
    const long = p.text.length > LONG;
    const open = whole.has(key);
    const opened = () => track("parallel_opened", { kind: half });
    return (
      <li key={key}>
        <div className="parallel-where">
          <b>{p.ref}</b>
          <small>{p.source}</small>
          <span className="parallel-score">
            {p.percent}%<span className="sr-only"> near in meaning</span>
          </span>
        </div>
        <p className={long && !open ? "clamp" : undefined}>{p.text}</p>
        <div className="parallel-acts">
          {long && (
            <button type="button" aria-expanded={open} onClick={() => setWhole((was) => new Set(open ? [...was].filter((k) => k !== key) : [...was, key]))}>
              {open ? "Show less" : "Read more"}
            </button>
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
                Open
                <span className="sr-only"> {p.ref}</span>
                <Icon name="paperAfter" />
              </Link>
            ) : (
              <a className="parallel-open" href={p.href} target="_blank" rel="noopener noreferrer" onClick={opened}>
                Open
                <span className="sr-only"> {p.ref} (opens in a new tab)</span>
                <Icon name="external" />
              </a>
            ))}
        </div>
      </li>
    );
  };

  return createPortal(
    <div className="terms-sheet parallels" role="dialog" aria-label={`Parallels for ${reference}`} tabIndex={-1} ref={box}>
      <button type="button" className="terms-close" aria-label="Close the parallels" onClick={onClose}>
        <Icon name="close" />
      </button>
      <h2 className="terms-title">Parallels for {reference}</h2>
      <p className="parallel-lead">Passages that are near in meaning. The nearest is first.</p>
      {/* Two halves of one control, as the theme in the reader settings. */}
      <div className="segment parallel-halves" role="group" aria-label="Works">
        {HALVES.map(([value, label]) => (
          <button type="button" key={value} aria-pressed={half === value} onClick={() => choose(value)}>
            {label}
          </button>
        ))}
      </div>

      {state.status === "loading" && (
        <div className="waiting" role="status" aria-label="Loading the parallels">
          <span />
          <span />
          <span />
        </div>
      )}
      {state.status === "failed" && (
        <p className="terms-empty" role="alert">
          The parallels did not load.{" "}
          <button type="button" onClick={() => { setState({ for: reference, status: "loading" }); setAttempt((n) => n + 1); }}>
            Try again
          </button>
        </p>
      )}
      {state.status === "ready" && list.length === 0 && <p className="terms-empty">{half === "outside" ? "No near passage was found in other works." : "No near passage was found in the Papers."}</p>}
      {shown.length > 0 && <ul className="parallel-list">{shown.map(item)}</ul>}
      {list.length > shown.length && (
        <button type="button" className="parallel-more" onClick={() => setAll(true)}>
          Show {list.length - shown.length} more
        </button>
      )}
      {state.status === "ready" && <p className="parallel-foot">A computer compares the meaning of each passage and gives the number. A parallel is not a source.</p>}
    </div>,
    document.body,
  );
}
