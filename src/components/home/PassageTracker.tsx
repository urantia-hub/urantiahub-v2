"use client";

import { useLayoutEffect } from "react";
import { track } from "@/analytics";

// Reports which passage shows. It sends the reference only.
// The inline script picks on a full page load. React does not run that script after a
// client-side navigation, so then this component picks, before the paint.
export function PassageTracker({ refs }: { refs: string[] }) {
  const key = refs.join(",");
  useLayoutEffect(() => {
    const list = key.split(",");
    const stage = document.querySelector<HTMLElement>(".stage");
    if (!stage) return;
    if (stage.dataset.pick === undefined) stage.dataset.pick = String(Math.floor(Math.random() * list.length));
    const ref = list[Number(stage.dataset.pick)];
    if (ref) track("home_passage_shown", { ref });
  }, [key]);
  return null;
}
