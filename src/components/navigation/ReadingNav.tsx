"use client";

import Link from "next/link";
import { lazy, Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { accountState, serverAccountState, subscribeToAccount } from "@/account/client";
import { failureWords } from "@/account/limited";
import { noSaved, savedState, subscribeToSaved, toggleBookmark } from "@/account/saved";
import { track } from "@/analytics";
import { createAudioEngine, type AudioEngine, type VoiceState } from "@/audio/engine";
import type { Track } from "@/audio/tracks";
import { Icon } from "@/components/icons";
import { Sheet } from "@/components/reader/Sheet";
import { TermsSheet } from "@/components/reader/TermsSheet";
import { isSounding, nextPick, pillJob, roundIntent, type DockInput } from "@/reader/dock-state";
import { saveLastRead } from "@/reader/last-read";
import { shareParagraph } from "@/reader/share";
import { Navigator } from "./Navigator";
import { nextHidden, sectionLabel, type NavPaper, type NavSection } from "./nav-state";

// Only a signed-in reader opens the notes, so their code loads at the first use.
const NoteSheet = lazy(() => import("@/components/reader/NoteSheet"));
// The parallels load at the first use too: most readers never open them.
// The image maker draws on a canvas. A reader who makes no image does not download it.
const ImageSheet = lazy(() => import("@/components/reader/ImageSheet"));
const ParallelsSheet = lazy(() => import("@/components/reader/ParallelsSheet"));

type Props = {
  paper: { id: string; title: string };
  sections: NavSection[];
  previous: NavPaper | null;
  next: NavPaper | null;
  // The audio for this paper, or null when the paper has no voice.
  tracks: Track[] | null;
};

const IDLE: VoiceState = { status: "idle", index: -1, time: 0, speed: 1 };
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

const paragraphText = (ref: string) => document.getElementById(ref)?.querySelector(":scope > .text, :scope > span:last-child")?.textContent?.trim() ?? "";

// Paragraphs are server HTML. The dock marks them with an attribute: one at a time for each kind of mark.
function mark(attribute: "data-picked" | "data-voice", ref: string | null) {
  document.querySelectorAll(`.para[${attribute}]`).forEach((el) => el.removeAttribute(attribute));
  if (ref) document.getElementById(ref)?.setAttribute(attribute, "");
}

function inView(ref: string | null): boolean {
  const el = ref ? document.getElementById(ref) : null;
  if (!el) return false;
  const box = el.getBoundingClientRect();
  return box.bottom > 60 && box.top < window.innerHeight - 120;
}

// The controls at the bottom of a paper: a round button for the voice, and a pill with three jobs.
export function ReadingNav({ paper, sections, previous, next, tracks }: Props) {
  const [current, setCurrent] = useState("0");
  const [progress, setProgress] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [deep, setDeep] = useState(false);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [voice, setVoice] = useState<VoiceState>(IDLE);
  const [backShown, setBackShown] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // The small panel above the row: the two more actions, or the question for a reader with no account.
  const [panel, setPanel] = useState<"more" | "ask" | "notes" | "image" | null>(null);
  const [askHref, setAskHref] = useState("");
  const account = useSyncExternalStore(subscribeToAccount, accountState, serverAccountState);
  const saved = useSyncExternalStore(subscribeToSaved, savedState, noSaved);
  const [termsOpen, setTermsOpen] = useState(false);
  const [parallelsOpen, setParallelsOpen] = useState(false);
  const termsOpenRef = useRef(false);
  const panelRef = useRef(false);
  const moreTile = useRef<HTMLButtonElement>(null);
  const saveTile = useRef<HTMLButtonElement>(null);
  const noteTile = useRef<HTMLButtonElement>(null);
  // The tile that gets the focus back when the question closes.
  const askedFrom = useRef<"save" | "note">("save");
  const toastTimer = useRef(0);
  const roundButton = useRef<HTMLButtonElement>(null);

  const engine = useRef<AudioEngine | null>(null);
  // The page follows the voice until the reader scrolls. `autoUntil` covers the page's own scroll.
  const following = useRef(true);
  const autoUntil = useRef(0);
  const lastVoiceRef = useRef<string | null>(null);
  // The marked paragraph before the last single click, for a double-click that selects a word.
  const beforeClick = useRef<string | null>(null);

  const voiceRef = tracks && voice.index >= 0 ? tracks[voice.index].ref : null;
  const sounding = isSounding(voice.status);
  const input: DockInput = { picked, status: voice.status, voiceRef };
  const job = pillJob(input);
  const intent = roundIntent(input);

  // Handlers that live outside React's render read the newest values from here.
  const latest = useRef(input);
  const onRoundRef = useRef<() => void>(() => {});

  useEffect(() => {
    track("paper_opened", { paper_id: paper.id });
  }, [paper.id]);

  const bring = useCallback((ref: string) => {
    const el = document.getElementById(ref);
    if (!el) return;
    autoUntil.current = Date.now() + 900;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const top = el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.22;
    window.scrollTo({ top: Math.max(0, top), behavior: reduced ? "auto" : "smooth" });
  }, []);

  useEffect(() => {
    if (!tracks) return;
    const created = createAudioEngine(tracks, {
      createAudio: () => new Audio(),
      onFinished: () => track("audio_finished_paper", { paper_id: paper.id, speed: created.getState().speed }),
    });
    engine.current = created;
    const off = created.subscribe(() => {
      const now = created.getState();
      setVoice(now);
      const ref = isSounding(now.status) ? tracks[now.index].ref : null;
      if (!ref) {
        lastVoiceRef.current = null;
        setBackShown(false);
        // The voice stopped. The page scrolled down to follow it, so the controls can be hidden.
        setHidden(false);
        return;
      }
      // When the voice reaches a marked paragraph, the mark goes and the player shows.
      // While the reader has the terms or a panel of that paragraph open, the mark stays, and so does the
      // panel: a reader can be in the middle of a note.
      setPicked((was) => (was === ref && !termsOpenRef.current && !panelRef.current ? null : was));
      if (ref !== lastVoiceRef.current) {
        // The reader scrolled, but can see the paragraph that just ended: follow again.
        if (!following.current && inView(lastVoiceRef.current)) following.current = true;
        lastVoiceRef.current = ref;
        // The page keeps the paragraph that plays in the upper part of the screen.
        if (following.current) bring(ref);
      }
      setBackShown(!following.current && !inView(ref));
    });
    return () => {
      off();
      created.destroy();
      engine.current = null;
      // Next.js keeps a page alive, hidden, for Back and Forward. Its state must not outlive its engine.
      setVoice(IDLE);
      setBackShown(false);
      setHidden(false);
      lastVoiceRef.current = null;
    };
  }, [tracks, paper.id, bring]);

  // The header of the page leaves and returns with these controls. CSS reads the mark.
  useEffect(() => {
    document.documentElement.dataset.bars = hidden ? "away" : "shown";
  }, [hidden]);
  useEffect(
    () => () => {
      delete document.documentElement.dataset.bars;
      delete document.documentElement.dataset.scrolled;
    },
    [],
  );

  // The terms belong to the marked paragraph. With no mark, there is no sheet.
  if (termsOpen && !picked) setTermsOpen(false);
  if (parallelsOpen && !picked) setParallelsOpen(false);
  if (panel && !picked) setPanel(null);
  // The notes belong to one reader. After a sign-out, or with another reader, the sheet goes.
  const readerKey = account.status === "in" ? (account.user?.key ?? null) : null;
  if (panel === "notes" && !readerKey) setPanel(null);

  useEffect(() => mark("data-picked", picked), [picked]);
  useEffect(() => mark("data-voice", sounding ? voiceRef : null), [sounding, voiceRef]);

  // A reader who arrives by a link to a paragraph: that paragraph is marked.
  useEffect(() => {
    const fromAddress = () => {
      let id = "";
      try {
        id = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return;
      }
      const el = id ? document.getElementById(id) : null;
      if (el?.classList.contains("para")) setPicked(id);
    };
    fromAddress();
    // Until this line, CSS marks the paragraph that the address names. From here, the dock owns the mark.
    document.documentElement.dataset.reader = "";
    window.addEventListener("hashchange", fromAddress);
    return () => {
      window.removeEventListener("hashchange", fromAddress);
      delete document.documentElement.dataset.reader;
    };
  }, []);

  // One listener for every paragraph of the paper.
  useEffect(() => {
    const article = document.querySelector(".paper");
    if (!article) return;
    const onClick = (event: Event) => {
      const target = event.target as HTMLElement;
      // A click with a modifier key, or with another mouse button, belongs to the browser: a new tab, a new window.
      const mouse = event as MouseEvent;
      if (mouse.metaKey || mouse.ctrlKey || mouse.shiftKey || mouse.altKey || mouse.button > 0) return;
      // A card of notes in the margin names its paragraph.
      const noted = target.closest<HTMLElement>("[data-notes-for]")?.dataset.notesFor;
      const para = noted ? document.getElementById(noted) : target.closest<HTMLElement>(".para");
      if (!para) return;
      // The small pen beside a reference opens the reader's notes on that paragraph.
      if (noted || target.closest(".mark-notes")) {
        setPicked(para.id);
        setHidden(false);
        setTermsOpen(false);
        setParallelsOpen(false);
        setPanel("notes");
        return;
      }
      // The reference is a real link for a reader with no JavaScript. Here it acts as a tap.
      if (target.closest("a.ref")) event.preventDefault();
      else if (target.closest("a")) return;
      const selecting = String(window.getSelection() ?? "") !== "";
      // The first click of a double-click has no selection yet. The second one puts the mark back.
      if ((event as MouseEvent).detail > 1) {
        if (selecting) setPicked(beforeClick.current);
        return;
      }
      // A press that selects words is not a tap.
      if (selecting) return;
      beforeClick.current = latest.current.picked;
      const nextRef = nextPick(latest.current, para.id);
      if (nextRef) track("paragraph_picked", { paper_id: paper.id });
      setPicked(nextRef);
      setHidden(false);
    };
    article.addEventListener("click", onClick);
    return () => article.removeEventListener("click", onClick);
  }, [paper.id]);

  useEffect(() => {
    if (voice.status === "failed") track("audio_failed", { paper_id: paper.id });
  }, [voice.status, paper.id]);

  useEffect(() => {
    const heads = [...document.querySelectorAll<HTMLElement>(".paper .sec")];
    let last = window.scrollY;
    let frame = 0;

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      let section = "0";
      for (const head of heads) {
        if (head.getBoundingClientRect().top <= 120) section = head.id.split(":")[1];
      }
      setCurrent(section);
      setProgress(max > 0 ? Math.min(1, Math.max(0, y / max)) : 0);
      // The header of the page has a line under it when the page is not at its top.
      if (y > 40) document.documentElement.dataset.scrolled = "";
      else delete document.documentElement.dataset.scrolled;
      setDeep(y > 140);

      const now = latest.current;
      if (isSounding(now.status)) {
        // A scroll by the reader stops the follow. The voice continues.
        if (Date.now() > autoUntil.current && Math.abs(y - last) > 4) following.current = false;
        setBackShown(!following.current && !inView(now.voiceRef));
      }
      // React can run the updater later, so it must not read `last` after the line below changes it.
      const previousY = last;
      last = y;
      setHidden((was) => nextHidden(previousY, y, was));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, [paper.id]);

  // The contents page offers the way back to this place.
  useEffect(() => {
    const at = sections.find((s) => s.id === current);
    saveLastRead({ paperId: paper.id, sectionId: current, label: at && at.id !== "0" ? sectionLabel(at) : null });
  }, [paper.id, current, sections]);

  function start(ref: string, from: "bar" | "paragraph") {
    const index = tracks?.findIndex((t) => t.ref === ref) ?? -1;
    if (index === -1) return;
    following.current = true;
    track("audio_started", { paper_id: paper.id, from });
    engine.current?.playAt(index);
  }

  function onRound() {
    if (!tracks || !engine.current) return;
    if (intent.kind === "pause") engine.current.pause();
    else if (intent.kind === "retry") engine.current.retry();
    else if (intent.kind === "resume") {
      setPicked(null);
      following.current = true;
      engine.current.resume();
      if (voiceRef) bring(voiceRef);
    } else if (intent.kind === "play-at") {
      setPicked(null);
      start(intent.ref, "paragraph");
    } else {
      const first = tracks.find((t) => (document.getElementById(t.ref)?.getBoundingClientRect().bottom ?? 0) > 90);
      start((first ?? tracks[0]).ref, "bar");
    }
  }

  useEffect(() => {
    // The terms and the parallels have the same place, and the same right to stay open under the voice.
    termsOpenRef.current = termsOpen || parallelsOpen;
    panelRef.current = panel !== null;
    latest.current = input;
    onRoundRef.current = onRound;
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || document.querySelector("dialog[open]")) return;
      // While the terms are open, Escape belongs to their sheet.
      if (event.key === "Escape" && !document.querySelector(".terms-sheet, .panel")) {
        setPicked(null);
        setHidden(false);
        return;
      }
      const target = event.target as HTMLElement | null;
      // Space with Shift scrolls up. That belongs to the browser.
      const plain = !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey;
      // In a sheet or a panel, Space scrolls the list. It does not start the voice behind it.
      if (event.key === " " && plain && tracks && !target?.closest('a,button,input,textarea,select,[contenteditable],[role="dialog"]')) {
        event.preventDefault();
        // A held key repeats. Only the first press counts.
        if (!event.repeat) onRoundRef.current();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [tracks]);

  // Headphone buttons and the lock screen.
  useEffect(() => {
    if (!tracks || !("mediaSession" in navigator)) return;
    const session = navigator.mediaSession;
    // "Play" must work from every state: at rest, after a pause, and after a failure.
    session.setActionHandler("play", () => {
      if (!isSounding(latest.current.status)) onRoundRef.current();
    });
    session.setActionHandler("pause", () => engine.current?.pause());
    session.setActionHandler("previoustrack", () => engine.current?.previous());
    session.setActionHandler("nexttrack", () => engine.current?.next());
    return () => {
      (["play", "pause", "previoustrack", "nexttrack"] as const).forEach((action) => session.setActionHandler(action, null));
    };
  }, [tracks]);

  useEffect(() => {
    if (!voiceRef || !("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: `${voiceRef} · ${paper.title}`, artist: "The Urantia Papers" });
  }, [voiceRef, paper.title]);

  // Close, Share, and "Try again" remove the control that had the focus. The focus goes to the round button,
  // so a keyboard reader stays in the controls.
  function refocus() {
    window.requestAnimationFrame(() => roundButton.current?.focus({ preventScroll: true }));
  }

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  // The sheet goes, and the focus returns to the tile that opened it.
  function closeTerms() {
    setTermsOpen(false);
    setParallelsOpen(false);
    window.requestAnimationFrame(() => moreTile.current?.focus({ preventScroll: true }));
  }

  function closePanel() {
    const tile = panel === "notes" || (panel === "ask" && askedFrom.current === "note") ? noteTile : panel === "ask" ? saveTile : moreTile;
    setPanel(null);
    window.requestAnimationFrame(() => tile.current?.focus({ preventScroll: true }));
  }

  function say(words: string) {
    setToast(words);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }

  // A reader with no account gets the question. Nothing is kept in the browser.
  function ask(from: "save" | "note") {
    askedFrom.current = from;
    setTermsOpen(false);
    setParallelsOpen(false);
    // The sign-in returns to this paragraph, and the row opens again.
    setAskHref(`/api/auth/start?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}#${picked}`)}`);
    setPanel("ask");
  }

  async function onSave() {
    if (!picked) return;
    if (account.status !== "in") return ask("save");
    const adding = !saved.bookmarks.has(picked);
    if (await toggleBookmark(picked)) track(adding ? "bookmark_added" : "bookmark_removed", { paper_id: paper.id });
    else say(failureWords("This did not save. Try again."));
  }

  function onNote() {
    if (!picked) return;
    if (account.status !== "in") return ask("note");
    setTermsOpen(false);
    setParallelsOpen(false);
    setPanel((was) => (was === "notes" ? null : "notes"));
  }

  async function onCopyText() {
    if (!picked) return;
    const text = paragraphText(picked);
    closePanel();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(`${text} (${picked})`);
      say("Text copied");
    } catch {
      // The browser refused the clipboard. The reader can still select the text.
    }
  }

  async function onShare() {
    if (!picked) return;
    const ref = picked;
    setPicked(null);
    setHidden(false);
    refocus();
    const method = await shareParagraph({
      title: `${ref} · ${paper.id === "0" ? paper.title : `Paper ${paper.id}, ${paper.title}`}`,
      url: `${window.location.origin}${window.location.pathname}#${ref}`,
    });
    if (method === "none") return;
    track("paragraph_shared", { ref, method });
    if (method === "copy") say("Link copied");
  }

  const section = sections.find((s) => s.id === current);
  const label = !section || section.id === "0" ? paper.title : sectionLabel(section);
  const paperLabel = paper.id === "0" ? "The Urantia Papers" : `Paper ${paper.id}`;
  const pauseShown = intent.kind === "pause";
  const isSaved = picked !== null && saved.bookmarks.has(picked);
  const roundName = pauseShown ? "Pause" : picked ? `Listen from ${picked}` : "Listen";
  // While the voice plays, the line shows the same thing as the time beside it: this paragraph.
  const length = tracks?.[voice.index]?.duration ?? 0;
  const fill = sounding ? (length > 0 ? Math.min(1, voice.time / length) : 0) : progress;
  const away = hidden && job === "reading" && !open;

  return (
    <>
      <div
        className={`dock${away ? " away" : ""}${deep ? " deep" : ""}`}
        data-testid="reading-bar"
        data-job={job}
        onFocus={() => setHidden(false)}
      >
        {/* The round button cannot work with no JavaScript. */}
        <noscript>
          <style>{".dock .round{display:none}"}</style>
        </noscript>
        {tracks && (
          <button type="button" className={`round${voice.status === "loading" ? " loading" : ""}`} data-testid="round-button" aria-label={roundName} onClick={onRound} ref={roundButton}>
            <Icon name={pauseShown ? "pause" : "play"} />
          </button>
        )}
        <div className="pill">
          {job === "reading" && (
            <div className="row read">
              {previous ? (
                <Link className="arrow" href={previous.href} aria-label={`Previous: ${previous.title}`} tabIndex={deep ? -1 : undefined}>
                  <Icon name="paperBefore" />
                </Link>
              ) : (
                <span className="arrow" />
              )}
              <button
                type="button"
                className="where"
                aria-haspopup="dialog"
                aria-label={`${paperLabel} ${label}. Open the navigator`}
                onClick={() => {
                  track("navigator_opened", { paper_id: paper.id });
                  setOpen(true);
                }}
              >
                <small>{paperLabel}</small>
                <span data-testid="reading-bar-label">{label}</span>
              </button>
              {next ? (
                <Link className="arrow" href={next.href} aria-label={`Next: ${next.title}`} tabIndex={deep ? -1 : undefined}>
                  <Icon name="paperAfter" />
                </Link>
              ) : (
                <span className="arrow" />
              )}
            </div>
          )}

          {job === "listening" && voice.status === "failed" && (
            <div className="row fail" role="alert">
              <span>The audio did not load</span>
              <button
                type="button"
                onClick={() => {
                  engine.current?.retry();
                  refocus();
                }}
              >
                Try again
              </button>
            </div>
          )}

          {job === "listening" && voice.status !== "failed" && (
            <div className="row play">
              <button type="button" aria-label="Previous paragraph" onClick={() => engine.current?.previous()}>
                <Icon name="previous" />
              </button>
              <div className="where">
                <small data-testid="voice-ref">{voiceRef}</small>
                <span data-testid="voice-time">
                  {clock(voice.time)} / {clock(tracks?.[voice.index]?.duration ?? 0)}
                </span>
              </div>
              <button type="button" aria-label="Next paragraph" onClick={() => engine.current?.next()}>
                <Icon name="next" />
              </button>
              <button type="button" className="speed" aria-label={`Speed ${voice.speed}×`} onClick={() => engine.current?.cycleSpeed()}>
                {voice.speed}×
              </button>
            </div>
          )}

          {job === "paragraph" && (
            <div className="row pick">
              <span className="pref" data-testid="picked-ref">
                {picked}
              </span>
              <div className="tiles">
                {/* While the site has no sign-in, there is nothing to save to. */}
                {account.status !== "off" && (
                  <button type="button" className="tile" aria-pressed={isSaved} onClick={onSave} ref={saveTile}>
                    <Icon name={isSaved ? "saved" : "save"} />
                    {isSaved ? "Saved" : "Save"}
                  </button>
                )}
                {account.status !== "off" && (
                  <button type="button" className="tile" aria-haspopup="dialog" aria-expanded={panel === "notes"} onClick={onNote} ref={noteTile}>
                    <Icon name="note" />
                    Note
                  </button>
                )}
                <button type="button" className="tile" onClick={onShare}>
                  <Icon name="share" />
                  Share
                </button>
                <button
                  type="button"
                  className="tile"
                  aria-haspopup="dialog"
                  aria-expanded={panel === "more" || termsOpen || parallelsOpen}
                  onClick={() => {
                    setTermsOpen(false);
                    setParallelsOpen(false);
                    setPanel((was) => (was === "more" || termsOpen || parallelsOpen ? null : "more"));
                  }}
                  ref={moreTile}
                >
                  <Icon name="more" />
                  More
                </button>
              </div>
              <button type="button" className="close" aria-label="Close"
                onClick={() => {
                  setPicked(null);
                  setHidden(false);
                  refocus();
                }}
              >
                <Icon name="close" />
              </button>
            </div>
          )}

          <div className={`fill${sounding ? " voice" : ""}`} style={{ width: `${Math.round(fill * 1000) / 10}%` }} />
        </div>
      </div>

      {backShown && (
        <button
          type="button"
          className="back-to-voice"
          onClick={() => {
            following.current = true;
            setBackShown(false);
            if (voiceRef) bring(voiceRef);
          }}
        >
          Back to the voice
        </button>
      )}
      {toast && (
        <div className="dock-toast" role="status">
          {toast}
        </div>
      )}

      {panel === "more" && picked && (
        <Sheet label="More" onClose={closePanel}>
          {/* The action that a reader uses most is at the end, near the thumb. */}
          <button type="button" className="panel-line" onClick={() => setPanel("image")}>
            <Icon name="image" />
            Make an image
          </button>
          <button
            type="button"
            className="panel-line"
            onClick={() => {
              setPanel(null);
              setParallelsOpen(false);
              setTermsOpen(true);
            }}
          >
            <Icon name="terms" />
            Terms in this paragraph
          </button>
          <button
            type="button"
            className="panel-line"
            onClick={() => {
              setPanel(null);
              setTermsOpen(false);
              setParallelsOpen(true);
            }}
          >
            <Icon name="parallels" />
            Parallels
          </button>
          <button type="button" className="panel-line" onClick={onCopyText}>
            <Icon name="copy" />
            Copy the text
          </button>
        </Sheet>
      )}
      {panel === "image" && picked && (
        <Suspense fallback={null}>
          <ImageSheet key={picked} reference={picked} paperId={paper.id} text={paragraphText(picked)} onClose={closePanel} />
        </Suspense>
      )}
      {panel === "notes" && picked && (
        <Suspense fallback={null}>
          {/* Another reader, or another paragraph: a new sheet, with an empty field. */}
          <NoteSheet key={`${readerKey}:${picked}`} reference={picked} paperId={paper.id} onClose={closePanel} />
        </Suspense>
      )}
      {panel === "ask" && picked && (
        <Sheet label="Sign in to save this" onClose={closePanel}>
          <h2>Sign in to save this</h2>
          <p>Your saved paragraphs and notes stay with your account.</p>
          <div className="panel-actions">
            <a className="panel-button dark" href={askHref}>
              Sign in
            </a>
            <button type="button" className="panel-button" onClick={closePanel}>
              Not now
            </button>
          </div>
        </Sheet>
      )}
      {termsOpen && picked && <TermsSheet reference={picked} paperId={paper.id} onClose={closeTerms} />}
      {parallelsOpen && picked && (
        <Suspense fallback={null}>
          <ParallelsSheet
            reference={picked}
            paperId={paper.id}
            onClose={closeTerms}
            // A passage of this paper: the list goes, and the mark moves to the paragraph that opens.
            onGo={(reference) => {
              if (!document.getElementById(reference)) return;
              setParallelsOpen(false);
              setPicked(reference);
              setHidden(false);
            }}
          />
        </Suspense>
      )}
      <Navigator
        open={open}
        onClose={() => setOpen(false)}
        paper={paper}
        sections={sections}
        current={current}
        previous={previous}
        next={next}
      />
    </>
  );
}
