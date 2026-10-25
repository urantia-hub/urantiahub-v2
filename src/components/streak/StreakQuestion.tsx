"use client";

import { useState, useSyncExternalStore } from "react";
import { accountKey } from "@/account/client";
import { readerCall } from "@/account/reader-call";
import { Sheet } from "@/components/reader/Sheet";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { answerStreak, closeStreakQuestion, serverStreakView, streakView, subscribeToStreak } from "@/streak/client";
import { registerDevice } from "@/notices/device-end";
import { deviceState } from "@/notices/push";
import type { Goal } from "@/streak/rules";

const NOTICES_ON = process.env.NEXT_PUBLIC_NOTICES === "on";

const GOALS: Goal[] = [1, 2, 3];

// The one question of the streak, after a signed-in reader finishes a first section. The answer is kept
// in the account, so no other device asks again. Words: wording C (Kelson, 2026-10-17).
export function StreakQuestion({ lang = "en" }: { lang?: Lang }) {
  const t = messages(lang).streak;
  const words: Record<Goal, string> = { 1: t.goal1, 2: t.goal2, 3: t.goal3 };
  const view = useSyncExternalStore(subscribeToStreak, streakView, serverStreakView);
  const [goal, setGoal] = useState<Goal>(1);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!view.asking) return null;

  async function answer(yes: boolean) {
    setBusy(true);
    // A yes asks this device for the push first, while the press still counts for the browser.
    // A reader who refuses keeps the streak, with no push.
    const key = accountKey();
    const canAsk = yes && NOTICES_ON && key !== null && (deviceState() === "ask" || deviceState() === "allowed");
    const joined = canAsk ? await registerDevice(key) : false;
    const saved = await answerStreak(yes, goal);
    if (saved && joined && accountKey() === key) {
      await readerCall("/api/me/notices", { method: "PUT", body: JSON.stringify({ push: { streak: true }, zone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" }) });
    }
    setBusy(false);
    setFailed(!saved);
  }

  return (
    <Sheet label={t.keep} onClose={closeStreakQuestion} className="notice-question streak-question">
      <h2>{t.askTitle}</h2>
      <p>{t.askBody(words[goal])}</p>
      <p className="streak-goals-label" id="streak-goals-label">
        {t.goalsLabel}
      </p>
      <div className="streak-goals" role="radiogroup" aria-labelledby="streak-goals-label">
        {GOALS.map((g) => (
          <button key={g} type="button" role="radio" aria-checked={goal === g} aria-label={t.goalName(g)} onClick={() => setGoal(g)}>
            {g}
          </button>
        ))}
      </div>
      {failed && <p role="alert">{t.askFailed}</p>}
      <button type="button" className="panel-button dark" disabled={busy} onClick={() => void answer(true)}>
        {t.yes}
      </button>
      <button type="button" className="notice-later" disabled={busy} onClick={() => void answer(false)}>
        {t.no}
      </button>
    </Sheet>
  );
}
