"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type MouseEvent, useEffect, useState, useSyncExternalStore } from "react";
import { track } from "@/analytics";
import { accountState, serverAccountState, signInHref, subscribeToAccount } from "@/account/client";
import { readerCall } from "@/account/reader-call";
import type { NoteResult } from "@/account/saved";
import type { AllSaved, SavedEntry, SavedNote } from "@/account/saved-data";
import { Icon } from "@/components/icons";
import { NoteThread } from "@/components/reader/NoteThread";
import { paperById, paperPath } from "@/content/paper-index";
import { age } from "@/reader/age";
import { groupByPaper, type Kind, latest, type Order, pick, sortEntries } from "@/saved/list";

type Data = { for: string | null; status: "loading" | "ready" | "failed"; entries: SavedEntry[]; cut: boolean };
const NOTHING: Data = { for: null, status: "loading", entries: [], cut: false };
const FAILED: NoteResult = { ok: false, why: "failed" };
const KINDS: [Kind, string][] = [["all", "All"], ["paragraphs", "Paragraphs"], ["notes", "Notes"]];
// In the list a long thread shows its last notes. The page of the paragraph shows them all.
const IN_LIST = 3;

const toSignIn = { href: "/api/auth/start", onClick: (event: MouseEvent<HTMLAnchorElement>) => void (event.currentTarget.href = signInHref()) };
const paragraphHref = (entry: { paperId: string; ref: string }) => (paperById(entry.paperId) ? `${paperPath(entry.paperId)}#${entry.ref}` : "/papers");
const threadHref = (ref: string) => `/saved?ref=${encodeURIComponent(ref)}`;

// All that the signed-in reader saved, on one page. With `?ref=`, the notes of one paragraph.
export function SavedView() {
  const account = useSyncExternalStore(subscribeToAccount, accountState, serverAccountState);
  const key = account.status === "in" ? (account.user?.key ?? null) : null;
  const reference = useSearchParams().get("ref");
  const [data, setData] = useState<Data>(NOTHING);
  const [attempt, setAttempt] = useState(0);
  // Another reader, or a sign-out: nothing of the reader before stays on the page.
  if (data.for !== key) setData({ ...NOTHING, for: key });

  useEffect(() => {
    if (!key) return;
    let current = true;
    void readerCall("/api/me/saved").then((body) => {
      if (!current) return;
      const all = body as Partial<AllSaved> | null;
      setData(all && Array.isArray(all.entries) ? { for: key, status: "ready", entries: all.entries, cut: all.cut === true } : { for: key, status: "failed", entries: [], cut: false });
    });
    return () => {
      current = false;
    };
  }, [key, attempt]);

  // Each change goes to the account first. The list changes when the account took it.
  const change = (ref: string, next: (entry: SavedEntry) => SavedEntry) =>
    setData((was) => ({ ...was, entries: was.entries.map((entry) => (entry.ref === ref ? next(entry) : entry)).filter((entry) => entry.savedAt !== null || entry.notes.length > 0) }));

  async function note(ref: string, path: string, init: RequestInit, done: (notes: SavedNote[], made?: SavedNote) => SavedNote[]): Promise<NoteResult> {
    const answer = (await readerCall(path, init)) as { ok?: unknown; why?: unknown; note?: SavedNote } | null;
    if (!answer) return FAILED;
    const gone = answer.ok === false && answer.why === "gone";
    if (answer.ok !== true && !gone) return FAILED;
    change(ref, (entry) => ({ ...entry, notes: done(entry.notes, answer.note) }));
    const paper_id = ref.split(":")[0];
    if (init.method === "DELETE") track("note_deleted", { paper_id });
    else if (!gone) track("note_saved", { paper_id, kind: init.method === "POST" ? "new" : "change" });
    return gone ? { ok: false, why: "gone" } : { ok: true };
  }
  const actions = (ref: string) => ({
    add: (reference: string, text: string) => note(ref, "/api/me/notes", { method: "POST", body: JSON.stringify({ ref: reference, text }) }, (notes, made) => (made ? [...notes, made] : notes)),
    change: (id: string, text: string) =>
      note(ref, `/api/me/notes/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify({ text }) }, (notes, made) => (made ? notes.map((n) => (n.id === id ? made : n)) : notes.filter((n) => n.id !== id))),
    remove: (id: string) => note(ref, `/api/me/notes/${encodeURIComponent(id)}`, { method: "DELETE" }, (notes) => notes.filter((n) => n.id !== id)),
  });
  const [problem, setProblem] = useState<string | null>(null);
  async function unsave(ref: string) {
    setProblem(null);
    const answer = (await readerCall(`/api/me/bookmarks?ref=${encodeURIComponent(ref)}`, { method: "DELETE" })) as { ok?: unknown } | null;
    if (answer?.ok !== true) return setProblem("The paragraph is still saved. Try again.");
    change(ref, (entry) => ({ ...entry, savedAt: null }));
    track("bookmark_removed", { paper_id: ref.split(":")[0] });
  }

  const waiting = account.status === "in" && (key === null || data.status === "loading");
  const signedOut = account.status !== "in";

  if (reference !== null) {
    const entry = data.entries.find((e) => e.ref === reference);
    const paperId = reference.split(":")[0];
    const paper = paperById(paperId);
    return (
      <div className="saved-page">
        <p className="saved-back">
          {paper && (
            <Link href={`${paperPath(paperId)}#${reference}`}>
              <Icon name="paperBefore" />
              {paperId === "0" ? paper.title : `Paper ${paperId}`}
            </Link>
          )}
          <Link href="/saved">All saved</Link>
        </p>
        <h1>Your notes on {reference}</h1>
        {signedOut && <SignedOut on={account.status === "out"} />}
        {waiting && <Rows />}
        {!signedOut && data.status === "failed" && <Failed again={() => setAttempt((n) => n + 1)} />}
        {!signedOut && data.status === "ready" && (
          <>
            {/* The whole paragraph: the reader needs the text while they write. */}
            {entry && <p className="saved-quote">{entry.text}</p>}
            <p className="saved-only">Only you see them.</p>
            <div className="saved-thread">
              <NoteThread reference={reference} notes={entry?.notes ?? []} {...actions(reference)} add={entry ? actions(reference).add : undefined} />
            </div>
            {!entry && <p className="saved-empty">You have no notes on this paragraph.</p>}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="saved-page">
      <h1>Saved</h1>
      {signedOut && <SignedOut on={account.status === "out"} />}
      {waiting && <Rows />}
      {!signedOut && data.status === "failed" && <Failed again={() => setAttempt((n) => n + 1)} />}
      {!signedOut && data.status === "ready" && <List data={data} actions={actions} unsave={unsave} problem={problem} />}
    </div>
  );
}

function SignedOut({ on }: { on: boolean }) {
  return (
    <div className="saved-empty">
      <b>Your saved paragraphs and notes</b>
      Sign in to find them here.
      {on && (
        <a className="saved-button" {...toSignIn}>
          Sign in
        </a>
      )}
    </div>
  );
}

function Rows() {
  return (
    <div className="saved-waiting" role="status" aria-label="Loading what you saved">
      {[0, 1, 2].map((n) => (
        <div key={n}>
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

function Failed({ again }: { again: () => void }) {
  return (
    <p className="saved-empty" role="alert">
      This did not load.{" "}
      <button type="button" onClick={again}>
        Try again
      </button>
    </p>
  );
}

type ListProps = { data: Data; actions: (ref: string) => { change: (id: string, text: string) => Promise<NoteResult>; remove: (id: string) => Promise<NoteResult> }; unsave: (ref: string) => void; problem: string | null };

function List({ data, actions, unsave, problem }: ListProps) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const [order, setOrder] = useState<Order>("newest");
  const found = sortEntries(pick(data.entries, kind, query), order);

  const item = (entry: SavedEntry) => (
    <li className="saved-entry" key={entry.ref}>
      <Link className="saved-where" href={paragraphHref(entry)} prefetch={false}>
        <small>
          {entry.ref}
          {entry.savedAt !== null && (
            <span role="img" aria-label="Saved">
              <Icon name="saved" />
            </span>
          )}
          <span>· {age(latest(entry))}</span>
        </small>
        <span className="saved-text">{entry.text}</span>
      </Link>
      {entry.notes.length > 0 && (
        <div className="saved-thread">
          {/* The list has no field for a new note. The reader writes one on the paper, or on the page of the paragraph. */}
          <NoteThread reference={entry.ref} notes={entry.notes} change={actions(entry.ref).change} remove={actions(entry.ref).remove} last={IN_LIST} allHref={threadHref(entry.ref)} />
        </div>
      )}
      {entry.savedAt !== null && (
        <button type="button" className="saved-remove" onClick={() => unsave(entry.ref)}>
          Remove<span className="sr-only"> {entry.ref} from Saved</span>
        </button>
      )}
    </li>
  );

  if (data.entries.length === 0) {
    return (
      <p className="saved-empty">
        <b>Nothing saved yet</b>
        Tap a paragraph in a paper to save it.
      </p>
    );
  }
  return (
    <>
      <label className="saved-find">
        <Icon name="search" />
        <input type="search" placeholder="Search what you saved" aria-label="Search what you saved" value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <div className="saved-tools">
        <div className="saved-kinds" role="group" aria-label="Show">
          {KINDS.map(([value, label]) => (
            <button type="button" key={value} aria-pressed={kind === value} onClick={() => setKind(value)}>
              {label}
            </button>
          ))}
        </div>
        <button type="button" className="saved-order" aria-label={`Sort: ${order === "newest" ? "Newest first" : "By paper"}. Change the sort`} onClick={() => setOrder(order === "newest" ? "paper" : "newest")}>
          {order === "newest" ? "Newest first" : "By paper"}
        </button>
      </div>
      {data.cut && <p className="saved-note">This list shows the first 2,000 of each kind.</p>}
      {problem && (
        <p className="saved-note" role="alert">
          {problem}
        </p>
      )}
      {found.length === 0 ? (
        <p className="saved-empty">
          <b>Nothing matches</b>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setKind("all");
            }}
          >
            Show all
          </button>
        </p>
      ) : order === "paper" ? (
        groupByPaper(found).map((group) => (
          <section key={group.paperId} aria-label={group.title}>
            <h2 className="saved-paper">{group.title}</h2>
            <ul className="saved-list">{group.entries.map(item)}</ul>
          </section>
        ))
      ) : (
        <ul className="saved-list">{found.map(item)}</ul>
      )}
    </>
  );
}
