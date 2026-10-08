"use client";

import Link from "next/link";
import { track } from "@/analytics";
import type { Part } from "@/search/snippet";

type Props = { href: string; parts: Part[]; reference: string; paper: string; group: "exact" | "related"; position: number };

// One result: a snippet, the reference, and the paper. It opens the paper at that paragraph.
export function ResultLink({ href, parts, reference, paper, group, position }: Props) {
  return (
    <Link className="result" href={href} onClick={() => track("search_result_opened", { group, position })}>
      <p>{parts.map((part, i) => (part.marked ? <mark key={i}>{part.text}</mark> : <span key={i}>{part.text}</span>))}</p>
      <footer>
        {reference}
        <span>{paper}</span>
      </footer>
    </Link>
  );
}
