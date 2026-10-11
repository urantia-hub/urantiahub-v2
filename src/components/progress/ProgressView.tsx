"use client";

import Link from "next/link";
import { type MouseEvent, useEffect, useState, useSyncExternalStore } from "react";
import { accountState, serverAccountState, signInHref, subscribeToAccount } from "@/account/client";
import { summarize, type Summary } from "@/account/progress-summary";
import { readerCall } from "@/account/reader-call";
import { Icon } from "@/components/icons";
import { paperPath, referenceHref } from "@/content/paper-index";
import { readLastRead, subscribeToLastRead } from "@/reader/last-read";

type Data = { for: string | null; status: "loading" | "ready" | "failed"; counts: Record<string, number> };
const NOTHING: Data = { for: null, status: "loading", counts: {} };
const none = () => null;
const toSignIn = { href: "/api/auth/start", onClick: (event: MouseEvent<HTMLAnchorElement>) => void (event.currentTarget.href = signInHref()) };

// What the signed-in reader read: the whole text, each part, and the papers that are open.
export function ProgressView() {
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

  const signedOut = account.status !== "in";
  return (
    <div className="saved-page progress-page">
      <p className="saved-back">
        <Link href="/papers">
          <Icon name="paperBefore" />
          Papers
        </Link>
      </p>
      <h1>Your progress</h1>
      {signedOut && (
        <div className="saved-empty">
          <b>What you read</b>
          Sign in, and UrantiaHub keeps count of the paragraphs that you read.
          {account.status === "out" && (
            <a className="saved-button" {...toSignIn}>
              Sign in
            </a>
          )}
        </div>
      )}
      {!signedOut && data.status === "loading" && <p className="progress-wait" role="status" aria-label="Loading your progress" />}
      {!signedOut && data.status === "failed" && (
        <p className="saved-empty" role="alert">
          Your progress did not load.{" "}
          <button type="button" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        </p>
      )}
      {!signedOut && data.status === "ready" && <Shown summary={summarize(data.counts, last?.paperId ?? null)} place={last} />}
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

const count = (n: number) => n.toLocaleString("en-US");

function Shown({ summary, place }: { summary: Summary; place: { paperId: string; sectionId: string } | null }) {
  return (
    <>
      <p className="progress-lead">What you read while you were signed in.</p>
      <p className="progress-total">
        <b>{summary.percent}%</b>
        <span>
          {count(summary.read)} of {count(summary.total)} paragraphs
        </span>
      </p>
      <Line percent={summary.percent} />
      <dl className="progress-facts">
        <div>
          <dd>{summary.finished}</dd>
          <dt>{summary.finished === 1 ? "paper finished" : "papers finished"}</dt>
        </div>
        <div>
          <dd>{summary.started}</dd>
          <dt>in progress</dt>
        </div>
        <div>
          <dd>{summary.untouched}</dd>
          <dt>not started</dt>
        </div>
      </dl>

      {summary.read === 0 && (
        <p className="saved-empty">
          <b>Nothing yet</b>
          Open a paper and read. A paragraph counts after it stays in view for a moment.
          <Link className="saved-button" href="/papers">
            All papers
          </Link>
        </p>
      )}

      {summary.next.length > 0 && (
        <section aria-labelledby="progress-next">
          <h2 id="progress-next">Continue</h2>
          {summary.next.map((paper) => (
            <Link className="progress-row" key={paper.id} href={place && place.paperId === paper.id ? referenceHref(place) : paperPath(paper.id)}>
              <Ring percent={paper.percent} />
              <span>
                <b>{paper.title}</b>
                <small>
                  {paper.id === "0" ? "" : `Paper ${paper.id} · `}
                  {paper.percent}%
                </small>
              </span>
              <Icon name="paperAfter" />
            </Link>
          ))}
        </section>
      )}

      <section aria-labelledby="progress-parts">
        <h2 id="progress-parts">By part</h2>
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

      {summary.read > 0 && <p className="progress-quiet">A paragraph counts as read after it stays in view for a moment. A paper is finished at nine of ten paragraphs.</p>}
    </>
  );
}
