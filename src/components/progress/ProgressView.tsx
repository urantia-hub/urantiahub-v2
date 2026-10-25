"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { accountState, serverAccountState, subscribeToAccount } from "@/account/client";
import { summarize, type Summary } from "@/account/progress-summary";
import { readerCall } from "@/account/reader-call";
import { Icon } from "@/components/icons";
import { ProgressShell } from "@/components/you/YouShell";
import { paperPath, referenceHref } from "@/content/paper-index";
import { type Lang, numberIn } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { contentsHref } from "@/i18n/paths";
import { readLastRead, subscribeToLastRead } from "@/reader/last-read";

type Data = { for: string | null; status: "loading" | "ready" | "failed"; counts: Record<string, number> };
const NOTHING: Data = { for: null, status: "loading", counts: {} };
const none = () => null;

// What the signed-in reader read: the whole text, each part, and the papers that are open.
// It is a part of the reader's page (`YouView`), which shows it to a signed-in reader only.
export function ProgressView({ lang = "en" }: { lang?: Lang }) {
  const all = messages(lang);
  const account = useSyncExternalStore(subscribeToAccount, accountState, serverAccountState);
  const last = useSyncExternalStore(subscribeToLastRead, readLastRead, none);
  const key = account.status === "in" ? (account.user?.key ?? null) : null;
  const [data, setData] = useState<Data>(NOTHING);
  const [attempt, setAttempt] = useState(0);
  // Another reader, or a sign-out: nothing of the reader before stays on the page.
  if (data.for !== key) setData({ ...NOTHING, for: key });

  useEffect(() => {
    if (!key) return;
    let current = true;
    void readerCall("/api/me/progress").then((body) => {
      if (!current) return;
      const counts = (body as { counts?: unknown } | null)?.counts;
      setData(typeof counts === "object" && counts !== null ? { for: key, status: "ready", counts: counts as Record<string, number> } : { for: key, status: "failed", counts: {} });
    });
    return () => {
      current = false;
    };
  }, [key, attempt]);

  if (account.status !== "in") return null;
  return (
    <div className="progress-page">
      {data.status === "loading" && <ProgressShell lang={lang} />}
      {data.status === "failed" && (
        <p className="saved-empty" role="alert">
          {all.progress.failed}{" "}
          <button type="button" onClick={() => setAttempt((n) => n + 1)}>
            {all.tryAgain}
          </button>
        </p>
      )}
      {data.status === "ready" && <Shown summary={summarize(data.counts, last?.paperId ?? null, lang)} place={last} lang={lang} />}
    </div>
  );
}

function Line({ percent }: { percent: number }) {
  return (
    <div className="progress-line" aria-hidden="true">
      <i style={{ width: `${percent}%` }} />
    </div>
  );
}

const RING = 2 * Math.PI * 15;
function Ring({ percent }: { percent: number }) {
  return (
    <svg className="progress-ring" viewBox="0 0 36 36" aria-hidden="true">
      <circle className="bg" cx="18" cy="18" r="15" />
      <circle className="fg" cx="18" cy="18" r="15" strokeDasharray={RING} strokeDashoffset={RING * (1 - percent / 100)} />
    </svg>
  );
}


function Shown({ summary, place, lang }: { summary: Summary; place: { paperId: string; sectionId: string } | null; lang: Lang }) {
  const all = messages(lang);
  const t = all.progress;
  const count = numberIn(lang);
  return (
    <>
      <p className="progress-lead">{t.lead}</p>
      <p className="progress-total">
        <b>{summary.percent}%</b>
        <span>
          {t.ofParagraphs(count(summary.read), count(summary.total))}
        </span>
      </p>
      <Line percent={summary.percent} />
      <dl className="progress-facts">
        <div>
          <dd>{summary.finished}</dd>
          <dt>{t.finished(summary.finished)}</dt>
        </div>
        <div>
          <dd>{summary.started}</dd>
          <dt>{t.inProgress}</dt>
        </div>
        <div>
          <dd>{summary.untouched}</dd>
          <dt>{t.notStarted}</dt>
        </div>
      </dl>

      {summary.read === 0 && (
        <p className="saved-empty">
          <b>{t.nothingYet}</b>
          {t.nothingYetLine}
          <Link className="saved-button" href={contentsHref(lang)}>
            {all.allPapers}
          </Link>
        </p>
      )}

      {summary.next.length > 0 && (
        <section aria-labelledby="progress-next">
          <h2 id="progress-next">{t.continue}</h2>
          {summary.next.map((paper) => (
            <Link className="progress-row" key={paper.id} href={place && place.paperId === paper.id ? referenceHref(place, lang) : paperPath(paper.id, lang)}>
              <Ring percent={paper.percent} />
              <span>
                <b>{paper.title}</b>
                <small>
                  {paper.id === "0" ? "" : `${all.paperNumber(paper.id)} · `}
                  {paper.percent}%
                </small>
              </span>
              <Icon name="paperAfter" />
            </Link>
          ))}
        </section>
      )}

      <section aria-labelledby="progress-parts">
        <h2 id="progress-parts">{t.byPart}</h2>
        {summary.parts.map((part) => (
          <div className="progress-part" key={part.id}>
            <span>
              <b>{part.name}</b> {part.title && <small>{part.title}</small>}
            </span>
            <em>{part.percent}%</em>
            <Line percent={part.percent} />
          </div>
        ))}
      </section>

      {summary.read > 0 && <p className="progress-quiet">{t.quiet}</p>}
    </>
  );
}
