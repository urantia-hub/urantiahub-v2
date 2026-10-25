"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { track } from "@/analytics";
import { Icon } from "@/components/icons";
import { Score } from "@/components/parallels/Score";
import { paperById, paperPath } from "@/content/paper-index";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { contentsHref } from "@/i18n/paths";
import { WORKS } from "@/parallels-works";
import type { Parallel, ParallelsAnswer, Work } from "@/server/parallels";

type State = { for: string; status: "loading" | "failed" } | { for: string; status: "ready"; answer: ParallelsAnswer };
const REFERENCE = /^(\d{1,3}):\d{1,2}\.\d{1,3}$/;
const LONG = 220;
// The floor of the reader. The control can ask for more, not for less.
const FLOOR = 40;

// For a reader who wants to go deep: one paragraph beside all its parallels, of the Papers and of
// other works in one list, with a filter by work and by strength.
export function StudyView({ lang = "en" }: { lang?: Lang }) {
  const t = messages(lang);
  // The Papers by the name that the answer gives them in this language.
  const PAPERS = t.pair.papers;
  const given = useSearchParams().get("ref") ?? "";
  const paperId = REFERENCE.exec(given)?.[1];
  const paper = paperId ? paperById(paperId, lang) : undefined;
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
    fetch(`/api/parallels/${encodeURIComponent(reference)}${lang === "es" ? "?lang=es" : ""}`)
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
  }, [reference, attempt, lang]);

  if (!reference || !paper) {
    return (
      <div className="study-page">
        <h1>{t.study.title}</h1>
        <p className="study-empty">
          {t.study.help} <Link href={contentsHref(lang)}>{t.searchBrowse}</Link>
        </p>
      </div>
    );
  }

  const all: Parallel[] = state.status === "ready" ? [...state.answer.outside, ...state.answer.papers, ...(state.answer.nearby ?? [])].sort((a, b) => b.percent - a.percent) : [];
  // Each work that the Hub compares, the one with the most passages first. A work with none is in the list, not in use.
  const count = (work: string) => all.filter((p) => p.work === work).length;
  // An answer that a cache kept from before has no list of works: then the names that this code knows.
  const known: Work[] = state.status === "ready" && state.answer.works?.length ? state.answer.works : WORKS.map((work) => ({ work: work === "The Urantia Papers" ? PAPERS : work, source: "", href: null }));
  const listed = [...known, ...[...new Set(all.map((p) => p.work))].filter((work) => !known.some((k) => k.work === work)).map((work) => ({ work, source: "", href: null }))]
    .map((w) => ({ ...w, n: count(w.work) }))
    .sort((a, b) => b.n - a.n || a.work.localeCompare(b.work));
  const works = listed.filter((w) => w.n > 0).map((w) => w.work);
  const shown = all.filter((p) => !off.has(p.work) && p.percent >= strength);
  const worksName = off.size === 0 ? t.study.allWorks : works.length - off.size === 1 ? (works.find((w) => !off.has(w)) ?? "") : t.study.nWorks(works.length - off.size);
  const top = Math.max(FLOOR, ...all.map((p) => p.percent));

  return (
    <div className="study-page">
      <p className="study-back">
        <Link href={`${paperPath(paper.id, lang)}#${reference}`}>
          <Icon name="paperBefore" />
          {paper.id === "0" ? paper.title : t.study.paper(paper.id)}
        </Link>
      </p>
      <div className="study-cols">
        <div className="study-anchor">
          <h1>{t.parTitle(reference)}</h1>
          <p className="study-lead">{t.study.lead}</p>
          {state.status === "ready" && <p className="study-quote">{state.answer.text}</p>}
        </div>
        <div>
          {state.status === "loading" && (
            <div className="study-waiting" role="status" aria-label={t.parLoading}>
              <span />
              <span />
              <span />
            </div>
          )}
          {state.status === "failed" && (
            <p className="study-empty" role="alert">
              {t.parFailed}{" "}
              <button type="button" onClick={() => { setState({ for: reference, status: "loading" }); setAttempt((n) => n + 1); }}>
                {t.tryAgain}
              </button>
            </p>
          )}
          {state.status === "ready" && all.length === 0 && <p className="study-empty">{t.study.none}</p>}
          {all.length > 0 && (
            <>
              <details className="study-works">
                <summary>
                  <span>{worksName}</span>
                  <Icon name="paperAfter" />
                </summary>
                <div role="group" aria-label={t.parWorks}>
                  {listed.map(({ work, source, href, n }) => (
                    <div key={work} className={n === 0 ? "work none" : "work"}>
                      <label>
                        <input type="checkbox" disabled={n === 0} checked={n > 0 && !off.has(work)} onChange={() => setOff((was) => new Set(was.has(work) ? [...was].filter((w) => w !== work) : [...was, work]))} />
                        <span>
                          {work}
                          {source && <small>{source}</small>}
                        </span>
                      </label>
                      <b aria-label={t.study.passages(n)}>{n}</b>
                      {/* The page of the source, so a reader can see each text that the Hub compares. */}
                      {href !== null && work !== PAPERS && (
                        <a href={href} target="_blank" rel="noopener noreferrer" aria-label={t.study.sourceOf(work)} title={t.study.openSource}>
                          <Icon name="external" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </details>
              <label className="study-strength">
                {t.study.strength}
                <input type="range" min={FLOOR} max={top} value={strength} onChange={(event) => setStrength(Number(event.target.value))} />
                <span>{t.study.andMore(strength)}</span>
              </label>
              {shown.length === 0 && <p className="study-empty">{t.study.noneThisNear}</p>}
              <ul className="parallel-list">
                {shown.map((p) => {
                  const key = `${p.work}:${p.ref}`;
                  const long = p.text.length > LONG;
                  const open = whole.has(key);
                  const inside = p.work === PAPERS;
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
                        {long && (
                          <button type="button" aria-expanded={open} onClick={() => setWhole((was) => new Set(open ? [...was].filter((k) => k !== key) : [...was, key]))}>
                            {open ? t.parShowLess : t.parReadMore}
                          </button>
                        )}
                        {p.href !== null &&
                          (inside ? (
                            <Link className="parallel-open" href={p.href} prefetch={false}>
                              {t.parOpen}<span className="sr-only"> {p.ref}</span>
                              <Icon name="paperAfter" />
                            </Link>
                          ) : (
                            <a className="parallel-open" href={p.href} target="_blank" rel="noopener noreferrer">
                              {t.parOpen}<span className="sr-only"> {p.ref} {t.parNewTab}</span>
                              <Icon name="external" />
                            </a>
                          ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
