"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { track } from "@/analytics";
import { accountState, serverAccountState, subscribeToAccount } from "@/account/client";
import { failureWords } from "@/account/limited";
import { readerCall } from "@/account/reader-call";
import type { NoteResult } from "@/account/saved";
import type { AllSaved, SavedEntry, SavedNote } from "@/account/saved-data";
import { Icon } from "@/components/icons";
import { SignInLink } from "@/components/SignInLink";
import { NoteThread } from "@/components/reader/NoteThread";
import { paperById, paperPath } from "@/content/paper-index";
import type { Lang } from "@/i18n/lang";
import { messages, type Messages } from "@/i18n/messages";
import { contentsHref, savedHref } from "@/i18n/paths";
import { age } from "@/reader/age";
import { groupByPaper, type Kind, latest, type Order, pick, sortEntries } from "@/saved/list";

type Data = { for: string | null; status: "loading" | "ready" | "failed"; entries: SavedEntry[]; cut: boolean };
const NOTHING: Data = { for: null, status: "loading", entries: [], cut: false };
const FAILED: NoteResult = { ok: false, why: "failed" };
const kinds = (t: Messages): [Kind, string][] => [["all", t.kindAll], ["paragraphs", t.kindParagraphs], ["notes", t.kindNotes]];
// In the list a long thread shows its last notes. The page of the paragraph shows them all.
const IN_LIST = 3;

const paragraphHref = (entry: { paperId: string; ref: string }, lang: Lang) =>
  paperById(entry.paperId, lang) ? `${paperPath(entry.paperId, lang)}#${entry.ref}` : contentsHref(lang);

// All that the signed-in reader saved, on one page. With `?ref=`, the notes of one paragraph.
// On a Spanish page each paragraph shows its Spanish text.
export function SavedView({ lang = "en" }: { lang?: Lang }) {
  const t = messages(lang);
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
    void readerCall(lang === "es" ? "/api/me/saved?lang=es" : "/api/me/saved").then((body) => {
      if (!current) return;
      const all = body as Partial<AllSaved> | null;
      setData(all && Array.isArray(all.entries) ? { for: key, status: "ready", entries: all.entries, cut: all.cut === true } : { for: key, status: "failed", entries: [], cut: false });
    });
    return () => {
      current = false;
    };
  }, [key, attempt, lang]);

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
    if (answer?.ok !== true) return setProblem(failureWords(t.savedStill, lang));
    change(ref, (entry) => ({ ...entry, savedAt: null }));
    track("bookmark_removed", { paper_id: ref.split(":")[0] });
  }

  const waiting = account.status === "in" && (key === null || data.status === "loading");
  const signedOut = account.status !== "in";

  if (reference !== null) {
    const entry = data.entries.find((e) => e.ref === reference);
    const paperId = reference.split(":")[0];
    const paper = paperById(paperId, lang);
    return (
      <div className="saved-page">
        <p className="saved-back">
          {paper && (
            <Link href={`${paperPath(paperId, lang)}#${reference}`}>
              <Icon name="paperBefore" />
              {paperId === "0" ? paper.title : t.paperNumber(paperId)}
            </Link>
          )}
          <Link href={savedHref(lang)}>{t.allSaved}</Link>
        </p>
        <h1>{t.notesOn(reference)}</h1>
        {signedOut && <SignedOut on={account.status === "out"} lang={lang} />}
        {waiting && <Rows t={t} />}
        {!signedOut && data.status === "failed" && <Failed again={() => setAttempt((n) => n + 1)} lang={lang} />}
        {!signedOut && data.status === "ready" && (
          <>
            {/* The whole paragraph: the reader needs the text while they write. */}
            {entry && <p className="saved-quote">{entry.text}</p>}
            <p className="saved-only">{t.notesOnly}</p>
            <div className="saved-thread">
              <NoteThread whole reference={reference} notes={entry?.notes ?? []} {...actions(reference)} add={entry ? actions(reference).add : undefined} lang={lang} />
            </div>
            {!entry && <p className="saved-empty">{t.noNotesHere}</p>}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="saved-page">
      <h1>{t.savedTitle}</h1>
      {signedOut && <SignedOut on={account.status === "out"} lang={lang} />}
      {waiting && <Rows t={t} />}
      {!signedOut && data.status === "failed" && <Failed again={() => setAttempt((n) => n + 1)} lang={lang} />}
      {!signedOut && data.status === "ready" && <List data={data} actions={actions} unsave={unsave} problem={problem} lang={lang} />}
    </div>
  );
}

function SignedOut({ on, lang }: { on: boolean; lang: Lang }) {
  const t = messages(lang);
  return (
    <div className="saved-empty">
      <b>{t.savedSignedOutTitle}</b>
      {t.savedSignedOutLine}
      {on && (
        <SignInLink className="saved-button" lang={lang} />
      )}
    </div>
  );
}

function Rows({ t }: { t: Messages }) {
  return (
    <div className="saved-waiting" role="status" aria-label={t.savedLoading}>
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

function Failed({ again, lang }: { again: () => void; lang: Lang }) {
  const t = messages(lang);
  return (
    <p className="saved-empty" role="alert">
      {failureWords(t.savedFailed, lang)}{" "}
      <button type="button" onClick={again}>
        {t.tryAgain}
      </button>
    </p>
  );
}

type ListProps = { data: Data; actions: (ref: string) => { change: (id: string, text: string) => Promise<NoteResult>; remove: (id: string) => Promise<NoteResult> }; unsave: (ref: string) => void; problem: string | null; lang: Lang };

function List({ data, actions, unsave, problem, lang }: ListProps) {
  const t = messages(lang);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const [order, setOrder] = useState<Order>("newest");
  const found = sortEntries(pick(data.entries, kind, query), order);

  const item = (entry: SavedEntry) => (
    <li className="saved-entry" key={entry.ref}>
      <Link className="saved-where" href={paragraphHref(entry, lang)} prefetch={false}>
        <small>
          {entry.ref}
          {entry.savedAt !== null && (
            <span role="img" aria-label={t.saved}>
              <Icon name="saved" />
            </span>
          )}
          <span>· {age(latest(entry), undefined, lang)}</span>
        </small>
        <span className="saved-text">{entry.text}</span>
      </Link>
      {entry.notes.length > 0 && (
        <div className="saved-thread">
          {/* The list has no field for a new note. The reader writes one on the paper, or on the page of the paragraph. */}
          <NoteThread reference={entry.ref} notes={entry.notes} change={actions(entry.ref).change} remove={actions(entry.ref).remove} last={IN_LIST} allHref={savedHref(lang, entry.ref)} lang={lang} />
        </div>
      )}
      {entry.savedAt !== null && (
        <button type="button" className="saved-remove" onClick={() => unsave(entry.ref)}>
          {t.removeWord}
          <span className="sr-only">{t.removeFrom(entry.ref)}</span>
        </button>
      )}
    </li>
  );

  if (data.entries.length === 0) {
    return (
      <p className="saved-empty">
        <b>{t.savedNothing}</b>
        {t.savedNothingLine}
      </p>
    );
  }
  return (
    <>
      <label className="saved-find">
        <Icon name="search" />
        <input type="search" placeholder={t.savedSearch} aria-label={t.savedSearch} value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <div className="saved-tools">
        <div className="saved-kinds" role="group" aria-label={t.savedShow}>
          {kinds(t).map(([value, label]) => (
            <button type="button" key={value} aria-pressed={kind === value} onClick={() => setKind(value)}>
              {label}
            </button>
          ))}
        </div>
        <button type="button" className="saved-order" aria-label={t.orderLabel(order === "newest" ? t.orderNewest : t.orderPaper)} onClick={() => setOrder(order === "newest" ? "paper" : "newest")}>
          {order === "newest" ? t.orderNewest : t.orderPaper}
        </button>
      </div>
      {data.cut && <p className="saved-note">{t.savedCut}</p>}
      {problem && (
        <p className="saved-note" role="alert">
          {problem}
        </p>
      )}
      {found.length === 0 ? (
        <p className="saved-empty">
          <b>{t.nothingMatches}</b>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setKind("all");
            }}
          >
            {t.showAll}
          </button>
        </p>
      ) : order === "paper" ? (
        groupByPaper(found, lang).map((group) => (
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
