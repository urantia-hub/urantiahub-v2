"use client";

import { useState, useSyncExternalStore } from "react";
import { Sheet } from "@/components/reader/Sheet";
import { answerStreak, closeStreakQuestion, serverStreakView, streakView, subscribeToStreak } from "@/streak/client";
import type { Goal } from "@/streak/rules";

const GOALS: { goal: Goal; label: string }[] = [
  { goal: 1, label: "1 section a day" },
  { goal: 2, label: "2" },
  { goal: 3, label: "3" },
];

// The one question of the streak, after a signed-in reader finishes a first section. The answer is kept
// in the account, so no other device asks again. Words: wording C (Kelson, 2026-10-17).
export function StreakQuestion() {
  const view = useSyncExternalStore(subscribeToStreak, streakView, serverStreakView);
  const [goal, setGoal] = useState<Goal>(1);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!view.asking) return null;

  async function answer(yes: boolean) {
    setBusy(true);
    const saved = await answerStreak(yes, goal);
    setBusy(false);
    setFailed(!saved);
  }

  return (
    <Sheet label="Keep a streak" onClose={closeStreakQuestion} className="notice-question streak-question">
      <h2>Keep a streak?</h2>
      <p>Read or listen to one section a day, about 5 minutes. Collect marks for papers, parts, and the tools of the Hub.</p>
      <div className="streak-goals" role="radiogroup" aria-label="Sections a day">
        {GOALS.map((g) => (
          <button key={g.goal} type="button" role="radio" aria-checked={goal === g.goal} aria-label={`${g.goal} ${g.goal === 1 ? "section" : "sections"} a day`} onClick={() => setGoal(g.goal)}>
            {g.label}
          </button>
        ))}
      </div>
      {failed && <p role="alert">That did not save. Try again.</p>}
      <button type="button" className="panel-button dark" disabled={busy} onClick={() => void answer(true)}>
        Yes, keep a streak
      </button>
      <button type="button" className="notice-later" disabled={busy} onClick={() => void answer(false)}>
        No thanks
      </button>
    </Sheet>
  );
}
