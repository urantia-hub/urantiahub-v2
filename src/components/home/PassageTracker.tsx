"use client";

import { useEffect } from "react";
import { track } from "@/analytics";

// Reports which passage the inline script selected. It sends the reference only.
export function PassageTracker({ refs }: { refs: string[] }) {
  useEffect(() => {
    const pick = Number(document.querySelector<HTMLElement>(".stage")?.dataset.pick ?? 0);
    const ref = refs[pick];
    if (ref) track("home_passage_shown", { ref });
  }, [refs]);
  return null;
}
