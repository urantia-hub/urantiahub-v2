"use client";

import { useEffect } from "react";
import { track } from "@/analytics";
import { earnToolMark } from "@/streak/client";

type Props = { kind: "words" | "question"; exact: "0" | "1-5" | "6-50" | "51+" };

// Reports that a results page showed: the kind of query and a count range. Never the text.
export function ShownTracker({ kind, exact }: Props) {
  useEffect(() => {
    track("search_results_shown", { kind, exact });
    if (exact !== "0") void earnToolMark("search");
  }, [kind, exact]);
  return null;
}
