"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { track } from "@/analytics";
import { Icon } from "@/components/icons";
import { paperById, paperPath } from "@/content/paper-index";
import type { Parallel, ParallelsAnswer } from "@/server/parallels";

type State = { for: string; status: "loading" | "failed" } | { for: string; status: "ready"; answer: ParallelsAnswer };
const REFERENCE = /^(\d{1,3}):\d{1,2}\.\d{1,3}$/;
const LONG = 220;
// The floor of the reader. The control can ask for more, not for less.
const FLOOR = 40;

// For a reader who wants to go deep: one paragraph beside all its parallels, of the Papers and of
// other works in one list, with a filter by work and by strength.
export function StudyView() {
  const given = useSearchParams().get("ref") ?? "";
  const paperId = REFERENCE.exec(given)?.[1];
  const paper = paperId ? paperById(paperId) : undefined;
  const reference = paper ? given : "";
  const [state, setState] = useState<State>({ for: reference, status: "loading" });
  const [off, setOff] = useState<ReadonlySet<string>>(new Set());
  const [strength, setStrength] = useState(FLOOR);
  const [whole, setWhole] = useState<ReadonlySet<string>>(new Set());
  const [attempt, setAttempt] = useState(0);
  if (state.for !== reference) setState({ for: reference, status: "loading" });

  useEffect(() => {
    if (!reference) return;
    let current = true;
    fetch(`/api/parallels/${encodeURIComponent(reference)}`)
      .then((res) => (res.ok ? (res.json() as Promise<ParallelsAnswer>) : Promise.reject(new Error(String(res.status)))))
      .then((answer) => {
        if (!current) return;
        setState({ for: reference, status: "ready", answer });
        track("parallels_study_opened", { paper_id: reference.split(":")[0] });
      })
      .catch(() => current && setState({ for: reference, status: "failed" }));
    return () => {
      current = false;
    };
  }, [reference, attempt]);

  if (!reference || !paper) {
    return (
      <div className="study-page">
        <h1>Parallels</h1>
        <p className="study-empty">
          Tap a paragraph in a paper, then &quot;More&quot;, then &quot;Parallels&quot;. <Link href="/papers">Browse all papers</Link>
        </p>
      </div>
    );
  }

  const all: Parallel[] = state.status === "ready" ? [...state.answer.outside, ...state.answer.papers].sort((a, b) => b.percent - a.percent) : [];
  const works = [...new Set(all.map((p) => p.work))].sort((a, b) => a.localeCompare(b));
  const shown = all.filter((p) => !off.has(p.work) && p.percent >= strength);
  const worksName = off.size === 0 ? "All works" : works.length - off.size === 1 ? (works.find((w) => !off.has(w)) ?? "") : `${works.length - off.size} works`;
  const top = Math.max(FLOOR, ...all.map((p) => p.percent));

  return (
    <div className="study-page">
      <p className="study-back">
        <Link href={`${paperPath(paper.id)}#${reference}`}>
          <Icon name="paperBefore" />
          {paper.id === "0" ? paper.title : `Paper ${paper.id}`}
        </Link>
      </p>
      <div className="study-cols">
        <div className="study-anchor">
          <h1>Parallels for {reference}</h1>
          <p className="study-lead">Passages that are near in meaning, from the Papers and from other works.</p>
          {state.status === "ready" && <p className="study-quote">{state.answer.text}</p>}
        </div>
        <div>
          {state.status === "loading" && (
            <div className="study-waiting" role="status" aria-label="Loading the parallels">
              <span />
              <span />
              <span />
            </div>
          )}
          {state.status === "failed" && (
            <p className="study-empty" role="alert">
              The parallels did not load.{" "}
              <button type="button" onClick={() => { setState({ for: reference, status: "loading" }); setAttempt((n) => n + 1); }}>
                Try again
              </button>
            </p>
          )}
          {state.status === "ready" && all.length === 0 && <p className="study-empty">No near passage was found for this paragraph.</p>}
          {all.length > 0 && (
            <>
              <details className="study-works">
                <summary>
                  <span>{worksName}</span>
                  <Icon name="paperAfter" />
                </summary>
                <div role="group" aria-label="Works">
                  {works.map((work) => (
                    <label key={work}>
                      <input type="checkbox" checked={!off.has(work)} onChange={() => setOff((was) => new Set(was.has(work) ? [...was].filter((w) => w !== work) : [...was, work]))} />
                      {work}
                    </label>
                  ))}
                </div>
              </details>
              <label className="study-strength">
                Strength
                <input type="range" min={FLOOR} max={top} value={strength} onChange={(event) => setStrength(Number(event.target.value))} />
                <span>{strength}% and more</span>
              </label>
              {shown.length === 0 && <p className="study-empty">No passage is this near. Move the strength down, or choose more works.</p>}
              <ul className="parallel-list">
                {shown.map((p) => {
                  const key = `${p.work}:${p.ref}`;
                  const long = p.text.length > LONG;
                  const open = whole.has(key);
                  const inside = p.work === "The Urantia Papers";
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
                        {p.href !== null &&
                          (inside ? (
                            <Link className="parallel-open" href={p.href} prefetch={false}>
                              Open<span className="sr-only"> {p.ref}</span>
                              <Icon name="paperAfter" />
                            </Link>
                          ) : (
                            <a className="parallel-open" href={p.href} target="_blank" rel="noopener noreferrer">
                              Open<span className="sr-only"> {p.ref} (opens in a new tab)</span>
                              <Icon name="external" />
                            </a>
                          ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="parallel-foot">A computer compares the meaning of each passage and gives the number. A parallel is not a source.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
