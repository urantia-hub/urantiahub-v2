"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { track } from "@/analytics";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { markById, MARKS } from "@/marks/list";
import { markWords } from "@/marks/words";
import { momentPlayed, serverStreakView, streakView, subscribeToStreak } from "@/streak/client";
import { MarkSymbol } from "./MarkSymbol";

// The moment of a new mark: the one place where the Hub moves for reader state (Kelson, 2026-10-17).
// It grows with the tier (mock screen 5) and waits while the voice plays.
const BUZZ: Record<number, number[]> = { 1: [], 2: [30], 3: [30, 80, 30], 4: [220] };
const PIECES: Record<number, { n: number; kind: "burst" | "fall"; colors: string[] }> = {
  2: { n: 22, kind: "burst", colors: ["#2f7d5b", "#6fcf9f", "var(--accent)", "#d9b66a", "var(--mark)"] },
  3: { n: 40, kind: "fall", colors: ["#f3dc8f", "#d4a843", "#c9a24a", "#8a6420"] },
  4: { n: 70, kind: "fall", colors: ["#fbe9a8", "#d4a843", "#f6ecc9", "#a5b4fc"] },
};
// The same pause as the notice question: no sheet open, and no voice.
const busyPage = () => document.querySelector(".panel") !== null || [...document.querySelectorAll("audio")].some((audio) => !audio.paused);
const lessMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

export function MarkMoment({ lang = "en" }: { lang?: Lang }) {
  const t = messages(lang).marks;
  const words = markWords(lang);
  const view = useSyncExternalStore(subscribeToStreak, streakView, serverStreakView);
  const id = view.moments[0] ?? null;
  const [ready, setReady] = useState<string | null>(null);

  // A moment never covers the text while the voice plays or a sheet is open: it waits for a pause.
  useEffect(() => {
    if (!id) return;
    const check = () => {
      if (busyPage()) return;
      setReady(id);
      window.clearInterval(timer);
    };
    const timer = window.setInterval(check, 1000);
    const first = window.setTimeout(check, 400);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(first);
    };
  }, [id]);

  const mark = ready && ready === id ? markById(ready) : undefined;
  useEffect(() => {
    if (!mark) return;
    track("mark_earned", { id: mark.id, tier: mark.tier });
    if (!lessMotion() && BUZZ[mark.tier].length > 0) navigator.vibrate?.(BUZZ[mark.tier]);
  }, [mark]);

  const earned = view.card?.on ? MARKS.filter((m) => view.card?.on && view.card.marks[m.id]).length : 0;
  const pieces = useMemo(() => (mark ? makePieces(mark.tier) : []), [mark]);
  if (!mark) return null;
  const close = () => {
    setReady(null);
    momentPlayed(mark.id);
  };
  const tier = mark.tier;
  const full = tier >= 3;
  return createPortal(
    <div className={`mark-moment moment-${tier}${lessMotion() ? " still" : ""}`} role="dialog" aria-modal="true" aria-label={t.newMark(words.name(mark.id))}>
      {!full && <button type="button" className="moment-scrim" aria-hidden="true" tabIndex={-1} onClick={close} />}
      <div className={full ? "moment-full" : "moment-sheet"}>
        {tier === 4 && <div className="moment-glow" />}
        {full && <div className="moment-shine" />}
        <div className="moment-mark">
          <MarkSymbol tier={tier} symbol={mark.symbol} moment />
        </div>
        <div className="moment-words">
          {tier === 4 && <p className="moment-kicker">{words.tier(4).name}</p>}
          <h2>{words.name(mark.id)}</h2>
          <p>{tier === 1 ? t.newMarkLine(earned, MARKS.length) : mark.rule.kind === "streak" ? t.ofDays(words.effort(mark.id)) : t.ofReading(words.effort(mark.id))}</p>
          <button type="button" className={full ? "moment-button gold" : "moment-button"} onClick={close} autoFocus>
            {t.continue}
          </button>
        </div>
        {pieces.map((piece, i) => (
          <i key={i} className={`moment-piece ${piece.kind}`} style={piece.style} />
        ))}
      </div>
    </div>,
    document.body,
  );
}

function makePieces(tier: number): { kind: string; style: React.CSSProperties }[] {
  const plan = PIECES[tier];
  if (!plan) return [];
  // The burst of Silk starts just before the pour ends (Kelson). Gilt and Illuminated fall after the fill.
  const at = tier === 2 ? 1.25 : tier === 3 ? 1.9 : 3.1;
  return Array.from({ length: plan.n }, (_, k) => {
    const color = plan.colors[k % plan.colors.length];
    if (plan.kind === "burst") {
      const angle = Math.random() * Math.PI * 2;
      const reach = 80 + Math.random() * 90;
      return { kind: "burst", style: { background: color, animationDelay: `${at + Math.random() * 0.06}s`, "--x": `${Math.cos(angle) * reach}px`, "--y": `${Math.sin(angle) * reach + 60}px`, "--r": `${Math.random() * 540 - 270}deg` } as React.CSSProperties };
    }
    return {
      kind: "fall",
      style: {
        background: color,
        left: `${Math.random() * 100}%`,
        animationDelay: `${at + Math.random() * (tier === 4 ? 2.5 : 1)}s`,
        "--w": `${Math.random() * 60 - 30}px`,
        "--r": `${Math.random() * 720 - 360}deg`,
        "--d": `${(tier === 4 ? 3.5 : 2.2) + Math.random() * 1.5}s`,
      } as React.CSSProperties,
    };
  });
}
