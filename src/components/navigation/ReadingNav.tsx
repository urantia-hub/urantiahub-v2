"use client";

import Link from "next/link";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { accountState, serverAccountState, signInHref, subscribeToAccount } from "@/account/client";
import { failureWords } from "@/account/limited";
import { noSaved, savedState, subscribeToSaved, toggleBookmark } from "@/account/saved";
import { track } from "@/analytics";
import { createAudioEngine, type AudioEngine } from "@/audio/engine";
import { createPaperEngine, type PaperEngine, type PaperVoiceState } from "@/audio/paper-engine";
import type { Track } from "@/audio/tracks";
import type { PaperVoice } from "@/content/fetchers";
import { Icon } from "@/components/icons";
import { Sheet } from "@/components/reader/Sheet";
import { TermsSheet } from "@/components/reader/TermsSheet";
import { isSounding, nextPick, pillJob, roundIntent, type DockInput } from "@/reader/dock-state";
import { saveLastRead } from "@/reader/last-read";
import { ASK_PAPER_EVENT, paperPrompt, paragraphPrompt, questionsFor, type Before } from "@/reader/assistant";
import { sharedFromAddress, sharePath } from "@/reader/share-link";
import { clearSentence, markSentence, sentenceBox, sentenceMove } from "@/reader/voice-mark";
import { clearVoicePlace, readVoicePlace, saveVoicePlace, subscribeToVoicePlace } from "@/reader/voice-place";
import { createHearing } from "@/streak/heard";
import { noteParagraphs } from "@/streak/client";
import { queueRead } from "@/account/sync";
import { Navigator } from "./Navigator";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { EnglishOriginal } from "@/components/reader/EnglishOriginal";
import { nextHidden, sectionLabel, type NavPaper, type NavSection } from "./nav-state";

// Only a signed-in reader opens the notes, so their code loads at the first use.
const NoteSheet = lazy(() => import("@/components/reader/NoteSheet"));
// The parallels load at the first use too: most readers never open them.
// The image maker draws on a canvas. A reader who makes no image does not download it.
const ImageSheet = lazy(() => import("@/components/reader/ImageSheet"));
const ParallelsSheet = lazy(() => import("@/components/reader/ParallelsSheet"));
const ShareSheet = lazy(() => import("@/components/reader/ShareSheet"));
const AskSheet = lazy(() => import("@/components/reader/AskSheet"));

type Props = {
  paper: { id: string; title: string };
  sections: NavSection[];
  previous: NavPaper | null;
  next: NavPaper | null;
  // The audio for this paper, or null when the paper has no voice.
  tracks: Track[] | null;
  // One file for the whole paper. With it the voice plays that file; with none, one file for each paragraph.
  voice: PaperVoice | null;
  // The language of the page. A Spanish page has no voice (`tracks` is null).
  lang?: Lang;
  // On a Spanish page: the English title of each section, for the place. The place stays in English.
  englishTitles?: Record<string, string | null>;
};

const IDLE: PaperVoiceState = { status: "idle", index: -1, time: 0, speed: 1, item: null, sentence: 0 };
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

const paragraphText = (ref: string) => document.getElementById(ref)?.querySelector(":scope > .text, :scope > span:last-child")?.textContent?.trim() ?? "";

// The paragraphs before this one in its section, in the order of the text: the context of a question.
function paragraphsBefore(ref: string): Before[] {
  const before: Before[] = [];
  for (let el = document.getElementById(ref)?.previousElementSibling; el; el = el.previousElementSibling) {
    if (el.matches("p.para")) before.unshift({ ref: el.id, text: paragraphText(el.id) });
  }
  return before;
}

// Paragraphs and titles are server HTML. The dock marks them with an attribute: one at a time for each kind.
// `data-voice` is on what sounds (a title or a paragraph); `data-held` is on the paragraph of a pause.
function mark(attribute: "data-picked" | "data-voice" | "data-held", id: string | null) {
  document.querySelectorAll(`[${attribute}]`).forEach((el) => el.removeAttribute(attribute));
  if (id) document.getElementById(id)?.setAttribute(attribute, "");
}

// The element of an item of the voice: "title", "section:2", or a paragraph reference.
function itemId(paperId: string, key: string | null): string | null {
  if (!key) return null;
  if (key === "title") return "paper-top";
  return key.startsWith("section:") ? `${paperId}:${key.slice("section:".length)}` : key;
}

function inView(id: string | null): boolean {
  const el = id ? document.getElementById(id) : null;
  if (!el) return false;
  const box = el.getBoundingClientRect();
  return box.bottom > 60 && box.top < window.innerHeight - 120;
}

// The controls at the bottom of a paper: a round button for the voice, and a pill with three jobs.
export function ReadingNav({ paper, sections, previous, next, tracks, voice: paperVoice, lang = "en", englishTitles }: Props) {
  const t = messages(lang);
  const [current, setCurrent] = useState("0");
  const [progress, setProgress] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [deep, setDeep] = useState(false);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [voice, setVoice] = useState<PaperVoiceState>(IDLE);
  const [backShown, setBackShown] = useState(false);
  // The paragraph of a pause is out of view: a chip names it.
  const [pausedAway, setPausedAway] = useState(false);
  // Where the voice stopped on an earlier visit, for "Continue listening at". It goes at the first start.
  const stored = useSyncExternalStore(subscribeToVoicePlace, readVoicePlace, () => null);
  const [placeUsed, setPlaceUsed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // The small panel above the row: the two more actions, or the question for a reader with no account.
  const [panel, setPanel] = useState<"more" | "ask" | "notes" | "image" | "share" | "assistant" | null>(null);
  // A question about the whole paper, from the button below its title. It needs no marked paragraph.
  const [paperAsk, setPaperAsk] = useState(false);
  // The units that the image maker starts with, when it opens from the share sheet.
  const [imageStart, setImageStart] = useState<ReadonlySet<number> | undefined>(undefined);
  const [askHref, setAskHref] = useState("");
  const account = useSyncExternalStore(subscribeToAccount, accountState, serverAccountState);
  const saved = useSyncExternalStore(subscribeToSaved, savedState, noSaved);
  const [termsOpen, setTermsOpen] = useState(false);
  // The paragraph that shows its English original (Spanish pages only).
  const [origFor, setOrigFor] = useState<string | null>(null);
  const [parallelsOpen, setParallelsOpen] = useState(false);
  const termsOpenRef = useRef(false);
  const panelRef = useRef(false);
  const moreTile = useRef<HTMLButtonElement>(null);
  const saveTile = useRef<HTMLButtonElement>(null);
  const noteTile = useRef<HTMLButtonElement>(null);
  const shareTile = useRef<HTMLButtonElement>(null);
  // The tile that gets the focus back when the question closes.
  const askedFrom = useRef<"save" | "note">("save");
  const toastTimer = useRef(0);
  const roundButton = useRef<HTMLButtonElement>(null);

  const engine = useRef<AudioEngine | PaperEngine | null>(null);
  // The page follows the voice until the reader scrolls or marks a paragraph. `autoUntil` covers the page's
  // own scroll. While it follows, the other paragraphs fade (`data-fade`).
  // Each move of the page gets a number. A newer move stops an older one.
  const moving = useRef(0);
  const following = useRef(true);
  const [followShown, setFollowShown] = useState(true);
  const follow = useCallback((on: boolean) => {
    following.current = on;
    setFollowShown(on);
    // A move of the page that is under way stops with the follow.
    if (!on) moving.current += 1;
  }, []);
  // A mark ended while the voice played: the page returns to the voice at the next sentence.
  const wantBack = useRef(false);
  const autoUntil = useRef(0);

  // The key of the last item that sounded (a title or a paragraph).
  const lastVoiceRef = useRef<string | null>(null);
  const owedRef = useRef<string | null>(null);
  // The state of the voice before the newest one: a new sentence is a change from it.
  const latestVoice = useRef<PaperVoiceState>(IDLE);
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

  // The page moves to `to`, in a slow eased move of 1.1 seconds.
  // `jump` moves at once: for a reader who asked for less motion, and after the page was hidden.
  const moveTo = useCallback((to: number, jump = false) => {
    const mine = ++moving.current;
    const from = window.scrollY;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    // A scroll event up to 150 ms after a frame of this move is the page's own, not the reader's.
    autoUntil.current = Date.now() + 150;
    if (jump || reduced || typeof window.requestAnimationFrame !== "function") {
      window.scrollTo({ top: to, behavior: "auto" });
      return;
    }
    const began = performance.now();
    const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
    const step = () => {
      if (mine !== moving.current) return;
      const x = Math.min(1, (performance.now() - began) / 1100);
      autoUntil.current = Date.now() + 150;
      window.scrollTo({ top: from + (to - from) * ease(x), behavior: "auto" });
      if (x < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }, []);

  // The page moves the item into the upper part of the screen.
  const bring = useCallback(
    (key: string, jump = false) => {
      const el = document.getElementById(itemId(paper.id, key) ?? "");
      if (!el) return;
      moveTo(Math.max(0, el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.22), jump);
    },
    [paper.id, moveTo],
  );

  useEffect(() => {
    if (!tracks) return;
    const onFinished = () => {
      clearVoicePlace();
      track("audio_finished_paper", { paper_id: paper.id, speed: created.getState().speed, one_file: paperVoice !== null });
    };
    const onSystemPause = () => track("audio_system_pause", { paper_id: paper.id, hidden: document.hidden, one_file: paperVoice !== null });
    const created: AudioEngine | PaperEngine = paperVoice
      ? createPaperEngine(paperVoice, tracks.map((t) => t.ref), { createAudio: () => new Audio(), onFinished, onSystemPause })
      : createAudioEngine(tracks, {
          createAudio: () => new Audio(),
          onFinished,
          onSlowChange: (ms) => track("audio_slow_change", { paper_id: paper.id, seconds: Math.round(ms / 1000), hidden: document.hidden }),
          onSystemPause,
        });
    engine.current = created;
    // A paragraph that the voice played to near its end counts as read and for the streak, also with the screen off.
    const lengths = new Map(tracks.map((t) => [t.ref, t.duration]));
    const hearing = createHearing((ref) => lengths.get(ref) ?? 0);
    const off = created.subscribe(() => {
      const state = created.getState();
      // The engine of paragraph files knows no titles and no sentences.
      const now: PaperVoiceState =
        "item" in state ? (state as PaperVoiceState) : { ...state, item: isSounding(state.status) ? tracks[state.index].ref : null, sentence: 0 };
      const heard = hearing.observe(now.status === "idle" ? null : now.item, now.time);
      if (heard) {
        queueRead([heard]);
        noteParagraphs("heard", [heard]);
      }
      const was = latestVoice.current;
      latestVoice.current = now;
      setVoice(now);
      const ref = isSounding(now.status) ? tracks[now.index].ref : null;
      setPausedAway(now.status === "paused" && now.index >= 0 && !inView(tracks[now.index].ref));
      if (!ref) {
        // The voice stopped while the page was hidden (a locked phone at the end of the paper): the page
        // owes the move to the last item that sounded, and makes it when it shows again.
        if (document.hidden && following.current && lastVoiceRef.current) owedRef.current = lastVoiceRef.current;
        lastVoiceRef.current = null;
        // A move of the page that is under way stops: a scroll down would hide the controls.
        moving.current += 1;
        setBackShown(false);
        // The voice stopped. The page scrolled down to follow it, so the controls can be hidden.
        setHidden(false);
        return;
      }
      const key = now.item ?? ref;
      // When the voice reaches a marked paragraph, the mark goes and the player shows.
      // While the reader has the terms or a panel of that paragraph open, the mark stays, and so does the
      // panel: a reader can be in the middle of a note.
      setPicked((was) => (was === ref && !termsOpenRef.current && !panelRef.current ? null : was));
      if (key !== lastVoiceRef.current) {
        // The reader scrolled, but can see the item that just ended: follow again.
        if (!following.current && latest.current.picked === null && inView(itemId(paper.id, lastVoiceRef.current))) follow(true);
        lastVoiceRef.current = key;
        owedRef.current = null;
        // The page keeps what sounds in the upper part of the screen. A hidden page moves when it shows again.
        if (following.current && !document.hidden) bring(key);
      } else if (wantBack.current && now.sentence !== was.sentence && latest.current.picked === null) {
        // The reader's mark ended. At the next sentence, the page goes back to the voice.
        wantBack.current = false;
        follow(true);
        bring(key);
      }
      setBackShown(!following.current && !inView(itemId(paper.id, key)));
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
  }, [tracks, paperVoice, paper.id, bring, follow]);

  // The header of the page leaves and returns with these controls. CSS reads the mark.
  useEffect(() => {
    document.documentElement.dataset.bars = hidden ? "away" : "shown";
  }, [hidden]);
  useEffect(
    () => () => {
      const root = document.documentElement;
      delete root.dataset.bars;
      delete root.dataset.scrolled;
      // The next page must not move with this page's voice, nor fade.
      moving.current += 1;
      for (const name of ["data-follow", "data-fade", "data-soft"]) root.removeAttribute(name);
      clearSentence();
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
  useEffect(() => mark("data-voice", sounding ? itemId(paper.id, voice.item ?? voiceRef) : null), [sounding, voice.item, voiceRef, paper.id]);
  // A pause keeps the bar beside its paragraph, and the text returns to full strength.
  useEffect(() => mark("data-held", voice.status === "paused" ? voiceRef : null), [voice.status, voiceRef]);

  // What CSS reads: the voice sounds (`data-follow`), and the page follows it, so the rest fades (`data-fade`).
  useEffect(() => {
    const root = document.documentElement;
    root.toggleAttribute("data-follow", sounding);
    root.toggleAttribute("data-fade", sounding && followShown);
  }, [sounding, followShown]);

  // The sentence that sounds is at full ink, and the rest of its paragraph is softer. Only the one file has
  // the times of the sentences.
  const sentenceCounts = useMemo(
    () => new Map((paperVoice?.starts ?? []).flatMap((s) => (s.sentences ? [[s.key, s.sentences.length] as const] : []))),
    [paperVoice],
  );
  // The length of each title in the one file: up to the next start.
  const itemLengths = useMemo(
    () => new Map((paperVoice?.starts ?? []).map((s, i, all) => [s.key, (all[i + 1]?.at ?? paperVoice!.duration) - s.at] as const)),
    [paperVoice],
  );
  useEffect(() => {
    const count = voice.item ? sentenceCounts.get(voice.item) : undefined;
    const on = sounding && voice.item !== null && count !== undefined && markSentence(voice.item, voice.sentence, count);
    if (!on) clearSentence();
    document.documentElement.toggleAttribute("data-soft", on);
    // In a long paragraph a later sentence can be under the controls: the page puts it in the middle.
    // The first sentence comes into view with its paragraph (`bring`).
    if (!on || voice.sentence === 0 || !following.current || document.hidden) return;
    const box = sentenceBox();
    const move = box ? sentenceMove(box, window.innerHeight) : null;
    if (move !== null) moveTo(Math.max(0, window.scrollY + move));
  }, [sounding, voice.item, voice.sentence, sentenceCounts, moveTo]);

  // A mark on a paragraph holds the page where it is, and the rest of the page returns to full strength.
  // When the mark goes, the page returns at the next sentence.
  const [pickSeen, setPickSeen] = useState<string | null>(null);
  if (picked !== pickSeen) {
    setPickSeen(picked);
    if (sounding && picked) setFollowShown(false);
  }
  const pickedBefore = useRef<string | null>(null);
  useEffect(() => {
    const was = pickedBefore.current;
    pickedBefore.current = picked;
    if (!isSounding(latest.current.status)) return;
    if (picked) {
      wantBack.current = false;
      following.current = false;
      moving.current += 1;
    } else if (was) wantBack.current = true;
  }, [picked]);

  // A page that was hidden (the screen off) jumps to the voice when it shows again: no long move through the paper.
  useEffect(() => {
    const onShow = () => {
      if (document.hidden) return;
      const key = lastVoiceRef.current;
      if (key && following.current && isSounding(latest.current.status)) bring(key, true);
      else if (owedRef.current && following.current) bring(owedRef.current, true);
      owedRef.current = null;
    };
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, [bring]);

  // The place of the voice stays in this browser, so a reader who comes back can continue there.
  useEffect(() => {
    if ((voice.status === "paused" || isSounding(voice.status)) && voiceRef) saveVoicePlace({ paperId: paper.id, ref: voiceRef });
  }, [voice.status, voiceRef, paper.id]);
  const place = !placeUsed && stored?.paperId === paper.id && tracks?.some((t) => t.ref === stored.ref) ? stored : null;

  // A reader who arrives by a link to a paragraph: that paragraph is marked.
  useEffect(() => {
    let first = true;
    const fromAddress = () => {
      // A link to some sentences of a paragraph: `SharedMark` marks them, and the paragraph has no mark.
      const sentences = first && sharedFromAddress(window.location.search, window.location.hash) !== null;
      first = false;
      if (sentences) return;
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
      // A press inside the English original does not mark its paragraph.
      if (target.closest(".orig")) return;
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
      const sounds = itemId(paper.id, lastVoiceRef.current ?? now.voiceRef);
      if (isSounding(now.status)) {
        // A scroll by the reader stops the follow, and the other paragraphs return. The voice continues.
        if (Date.now() > autoUntil.current && Math.abs(y - last) > 4) follow(false);
        // What sounds is in view again, with no mark: the page follows again.
        if (!following.current && now.picked === null && inView(sounds)) follow(true);
        setBackShown(!following.current && !inView(sounds));
      }
      setPausedAway(now.status === "paused" && now.voiceRef !== null && !inView(now.voiceRef));
      // React can run the updater later, so it must not read `last` after the line below changes it.
      const previousY = last;
      last = y;
      setHidden((was) => nextHidden(previousY, y, was));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    // A wheel or a finger on the page is the reader, also during a move of the page: the move stops.
    const onHand = () => {
      if (isSounding(latest.current.status) && following.current) follow(false);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onHand, { passive: true });
    window.addEventListener("touchmove", onHand, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onHand);
      window.removeEventListener("touchmove", onHand);
      window.cancelAnimationFrame(frame);
    };
  }, [paper.id, follow]);

  // The contents page offers the way back to this place.
  useEffect(() => {
    const found = sections.find((s) => s.id === current);
    const at = found && englishTitles ? { id: found.id, title: englishTitles[found.id] ?? null } : found;
    saveLastRead({ paperId: paper.id, sectionId: current, label: at && at.id !== "0" && (at.title || !englishTitles) ? sectionLabel(at) : null });
  }, [paper.id, current, sections, englishTitles]);

  function start(ref: string, from: "bar" | "paragraph" | "place" | "streak") {
    const index = tracks?.findIndex((t) => t.ref === ref) ?? -1;
    if (index === -1) return;
    follow(true);
    setPlaceUsed(true);
    track("audio_started", { paper_id: paper.id, from });
    engine.current?.playAt(index);
  }

  // From the top of a paper, the voice reads its title first.
  function startAtTop(from: "bar" | "streak") {
    const current = engine.current;
    if (!tracks || !current) return;
    if (!("playFromTitle" in current)) return start(tracks[0].ref, from);
    follow(true);
    setPlaceUsed(true);
    track("audio_started", { paper_id: paper.id, from });
    current.playFromTitle();
  }

  // "Listen" on the streak card: `?listen=1` with the section in the address starts the voice there.
  // The press on /you is in this document (a client move), so the browser lets the sound start.
  useEffect(() => {
    if (!tracks) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("listen") !== "1") return;
    params.delete("listen");
    const rest = params.toString();
    let at = "";
    try {
      at = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      return;
    }
    const top = at === "paper-top" || at === "";
    const first = top ? tracks[0] : tracks.find((t) => t.ref.startsWith(`${at}.`));
    if (!first) return;
    // After the engine of this render is ready, and outside the effect body.
    const timer = window.setTimeout(() => {
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${rest ? `?${rest}` : ""}${window.location.hash}`);
      if (top) startAtTop("streak");
      else start(first.ref, "streak");
    }, 0);
    return () => window.clearTimeout(timer);
    // Only the first load of the page reads the address.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks]);

  function onRound() {
    if (!tracks || !engine.current) return;
    if (intent.kind === "pause") engine.current.pause();
    else if (intent.kind === "retry") engine.current.retry();
    else if (intent.kind === "resume") {
      setPicked(null);
      follow(true);
      engine.current.resume();
      bring(lastVoiceRef.current ?? voiceRef ?? "");
    } else if (intent.kind === "play-at") {
      setPicked(null);
      start(intent.ref, "paragraph");
    } else {
      const first = tracks.find((t) => (document.getElementById(t.ref)?.getBoundingClientRect().bottom ?? 0) > 90) ?? tracks[0];
      if (first === tracks[0]) startAtTop("bar");
      else start(first.ref, "bar");
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
    // With one file, the lock screen shows a seek bar. Its buttons go to the paragraph before or after.
    const seeks = paperVoice ? (["seekbackward", "seekforward"] as const) : [];
    for (const action of seeks) {
      try {
        session.setActionHandler(action, () => (action === "seekbackward" ? engine.current?.previous() : engine.current?.next()));
      } catch {
        // A browser that does not know the action.
      }
    }
    return () => {
      ([...seeks, "play", "pause", "previoustrack", "nexttrack"] as const).forEach((action) => {
        try {
          session.setActionHandler(action, null);
        } catch {
          // A browser that does not know the action.
        }
      });
    };
  }, [tracks, paperVoice]);

  // The place in the one file, for the seek bar of the lock screen.
  useEffect(() => {
    const current = engine.current;
    if (!current || !("position" in current) || !isSounding(voice.status)) return;
    try {
      navigator.mediaSession?.setPositionState?.(current.position());
    } catch {
      // A position past the duration while the file loads. The next update sets it.
    }
  }, [voice.status, voice.index, voice.item, voice.speed]);

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

  useEffect(() => {
    const onAsk = () => {
      setPanel(null);
      setTermsOpen(false);
      setParallelsOpen(false);
      setPaperAsk(true);
    };
    window.addEventListener(ASK_PAPER_EVENT, onAsk);
    return () => window.removeEventListener(ASK_PAPER_EVENT, onAsk);
  }, []);

  // The sheet goes, and the focus returns to the tile that opened it.
  function closeTerms() {
    setTermsOpen(false);
    setParallelsOpen(false);
    window.requestAnimationFrame(() => moreTile.current?.focus({ preventScroll: true }));
  }

  function closePanel() {
    const tile = panel === "notes" || (panel === "ask" && askedFrom.current === "note") ? noteTile : panel === "ask" ? saveTile : panel === "share" ? shareTile : moreTile;
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
    setAskHref(signInHref(`${window.location.pathname}${window.location.search}#${picked}`));
    setPanel("ask");
  }

  async function onSave() {
    if (!picked) return;
    if (account.status !== "in") return ask("save");
    const adding = !saved.bookmarks.has(picked);
    if (await toggleBookmark(picked)) track(adding ? "bookmark_added" : "bookmark_removed", { paper_id: paper.id });
    else say(failureWords(t.saveFailed, lang));
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
      say(t.textCopied);
    } catch {
      // The browser refused the clipboard. The reader can still select the text.
    }
  }

  function onShare() {
    if (!picked) return;
    setTermsOpen(false);
    setParallelsOpen(false);
    setPanel((was) => (was === "share" ? null : "share"));
  }

  const section = sections.find((s) => s.id === current);
  const label = !section || section.id === "0" ? paper.title : sectionLabel(section, lang);
  const paperLabel = paper.id === "0" ? t.thePapers : t.paperNumber(paper.id);
  const pauseShown = intent.kind === "pause";
  const isSaved = picked !== null && saved.bookmarks.has(picked);
  const roundName = pauseShown ? "Pause" : picked ? `Listen from ${picked}` : "Listen";
  // While the voice plays, the line shows the same thing as the time beside it: this paragraph.
  // While a title sounds, the player names it and gives its own time.
  const titleKey = voice.item && voice.item !== voiceRef ? voice.item : null;
  const titleSection = titleKey?.startsWith("section:") ? sections.find((s) => s.id === titleKey.slice("section:".length)) : undefined;
  const playerLabel = titleKey === "title" ? paper.title : titleSection ? sectionLabel(titleSection) : voiceRef;
  const length = (titleKey ? itemLengths.get(titleKey) : undefined) ?? tracks?.[voice.index]?.duration ?? 0;
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
                <Link className="arrow" href={previous.href} aria-label={`${t.previous}: ${previous.title}`} tabIndex={deep ? -1 : undefined}>
                  <Icon name="paperBefore" />
                </Link>
              ) : (
                <span className="arrow" />
              )}
              <button
                type="button"
                className="where"
                aria-haspopup="dialog"
                aria-label={`${paperLabel} ${label}. ${t.openNavigator}`}
                onClick={() => {
                  track("navigator_opened", { paper_id: paper.id });
                  setOpen(true);
                }}
              >
                <small>{paperLabel}</small>
                <span data-testid="reading-bar-label">{label}</span>
              </button>
              {next ? (
                <Link className="arrow" href={next.href} aria-label={`${t.next}: ${next.title}`} tabIndex={deep ? -1 : undefined}>
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
                <small data-testid="voice-ref">{playerLabel}</small>
                <span data-testid="voice-time">
                  {clock(voice.time)} / {clock(length)}
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
                    {isSaved ? t.saved : t.save}
                  </button>
                )}
                {account.status !== "off" && (
                  <button type="button" className="tile" aria-haspopup="dialog" aria-expanded={panel === "notes"} onClick={onNote} ref={noteTile}>
                    <Icon name="note" />
                    {t.note}
                  </button>
                )}
                <button type="button" className="tile" aria-haspopup="dialog" aria-expanded={panel === "share"} onClick={onShare} ref={shareTile}>
                  <Icon name="share" />
                  {t.share}
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
                  {t.more}
                </button>
              </div>
              <button type="button" className="close" aria-label={t.close}
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
            follow(true);
            setBackShown(false);
            bring(lastVoiceRef.current ?? voiceRef ?? "");
          }}
        >
          Back to the voice
        </button>
      )}
      {!backShown && voice.status === "paused" && pausedAway && voiceRef && (
        <button
          type="button"
          className="back-to-voice"
          onClick={() => {
            setPicked(null);
            follow(true);
            bring(voiceRef);
          }}
        >
          Paused at {voiceRef}
        </button>
      )}
      {voice.status === "idle" && place && (
        <button type="button" className="back-to-voice" onClick={() => start(place.ref, "place")}>
          Continue listening at {place.ref}
        </button>
      )}
      {toast && (
        <div className="dock-toast" role="status">
          {toast}
        </div>
      )}

      {panel === "more" && picked && (
        <Sheet label={t.more} onClose={closePanel}>
          {/* The action that a reader uses most is at the end, near the thumb. */}
          <button
            type="button"
            className="panel-line"
            onClick={() => {
              setImageStart(undefined);
              setPanel("image");
            }}
          >
            <Icon name="image" />
            {t.makeImage}
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
            {t.termsRow}
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
            {t.parallelsRow}
          </button>
          <button type="button" className="panel-line" onClick={() => setPanel("assistant")}>
            <Icon name="ask" />
            {t.askRow}
          </button>
          <button type="button" className="panel-line" onClick={onCopyText}>
            <Icon name="copy" />
            {t.copyRow}
          </button>
          {lang === "es" && (
            <button
              type="button"
              className="panel-line"
              onClick={() => {
                setOrigFor(picked);
                setPanel(null);
              }}
            >
              <Icon name="globe" />
              {t.seeEnglish}
            </button>
          )}
        </Sheet>
      )}
      {panel === "assistant" && picked && (
        <Suspense fallback={null}>
          <AskSheet
            key={picked}
            about="paragraph"
            label={t.askAboutParagraph(picked)}
            paperId={paper.id}
            questions={questionsFor("paragraph", lang)}
            lang={lang}
            build={(question) => {
              const sectionId = picked.split(":")[1]?.split(".")[0] ?? "0";
              const section = sectionId === "0" ? null : (sections.find((one) => one.id === sectionId) ?? null);
              return paragraphPrompt({ question, paper, section, before: paragraphsBefore(picked), ref: picked, text: paragraphText(picked), link: `${window.location.origin}${sharePath(picked, new Set(), [], lang)}`, lang });
            }}
            onClose={closePanel}
          />
        </Suspense>
      )}
      {paperAsk && (
        <Suspense fallback={null}>
          <AskSheet
            about="paper"
            label={t.askAboutPaper(paper.id, paper.title)}
            paperId={paper.id}
            questions={questionsFor("paper", lang)}
            lang={lang}
            build={(question) => paperPrompt({ question, paper, link: `${window.location.origin}${window.location.pathname}`, lang })}
            onClose={() => {
              setPaperAsk(false);
              window.requestAnimationFrame(() => document.querySelector<HTMLElement>(".ask-paper")?.focus({ preventScroll: true }));
            }}
          />
        </Suspense>
      )}
      {panel === "image" && picked && (
        <Suspense fallback={null}>
          <ImageSheet key={picked} reference={picked} paperId={paper.id} text={paragraphText(picked)} start={imageStart} onClose={closePanel} lang={lang} />
        </Suspense>
      )}
      {panel === "share" && picked && (
        <Suspense fallback={null}>
          <ShareSheet
            key={picked}
            reference={picked}
            paperTitle={paper.title}
            text={paragraphText(picked)}
            onClose={closePanel}
            lang={lang}
            onCopied={() => {
              closePanel();
              say(t.linkCopied);
            }}
            onImage={(chosen) => {
              setImageStart(chosen.size > 0 ? chosen : undefined);
              setPanel("image");
            }}
          />
        </Suspense>
      )}
      {panel === "notes" && picked && (
        <Suspense fallback={null}>
          {/* Another reader, or another paragraph: a new sheet, with an empty field. */}
          <NoteSheet key={`${readerKey}:${picked}`} reference={picked} paperId={paper.id} onClose={closePanel} lang={lang} />
        </Suspense>
      )}
      {panel === "ask" && picked && (
        <Sheet label={t.signInToSave} onClose={closePanel}>
          <h2>{t.signInToSave}</h2>
          <p>{t.signInToSaveLine}</p>
          <div className="panel-actions">
            <a className="panel-button dark" href={askHref}>
              {t.signIn}
            </a>
            <button type="button" className="panel-button" onClick={closePanel}>
              {t.notNow}
            </button>
          </div>
        </Sheet>
      )}
      {origFor && <EnglishOriginal key={origFor} reference={origFor} onHide={() => setOrigFor(null)} />}
      {termsOpen && picked && <TermsSheet reference={picked} paperId={paper.id} lang={lang} onClose={closeTerms} />}
      {parallelsOpen && picked && (
        <Suspense fallback={null}>
          <ParallelsSheet
            reference={picked}
            paperId={paper.id}
            onClose={closeTerms}
            lang={lang}
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
        lang={lang}
      />
    </>
  );
}
