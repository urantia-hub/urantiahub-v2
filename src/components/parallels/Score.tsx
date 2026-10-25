"use client";

import Link from "next/link";
import { useState } from "react";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { howHref } from "@/i18n/paths";

// The number of a parallel. A press, or the pointer over it, says what the number is.
export function Score({ percent, lang = "en" }: { percent: number; lang?: Lang }) {
  const t = messages(lang);
  const [open, setOpen] = useState(false);
  const [over, setOver] = useState(false);
  return (
    <span className="parallel-score" onMouseEnter={() => setOver(true)} onMouseLeave={() => setOver(false)}>
      <button type="button" aria-expanded={open} aria-label={t.scoreLabel(percent)} onClick={() => setOpen((was) => !was)} onBlur={() => setOpen(false)}>
        {percent}%
      </button>
      {(open || over) && (
        // A press on the tip keeps the focus on the number, so the tip stays for its link.
        <span className="score-tip" role="status" onMouseDown={(e) => e.preventDefault()}>
          {t.scoreTip}{" "}
          <Link href={`${howHref(lang)}#number`}>{t.scoreLink}</Link>
        </span>
      )}
    </span>
  );
}
