"use client";

import Link from "next/link";
import { useState } from "react";
import { track } from "@/analytics";
import type { Part } from "@/search/snippet";

type Props = {
  href: string;
  parts: Part[];
  // The whole paragraph, when the snippet is cut. "Read more" shows it in place.
  whole?: Part[];
  // A close match: a typo fix, or most of the words.
  close?: boolean;
  reference: string;
  paper: string;
  group: "exact" | "related";
  position: number;
};

const Text = ({ parts }: { parts: Part[] }) => (
  <p>{parts.map((part, i) => (part.marked ? <mark key={i}>{part.text}</mark> : <span key={i}>{part.text}</span>))}</p>
);

// One result: a snippet, the reference, and the paper. The text opens the paper at that paragraph.
export function ResultLink({ href, parts, whole, close, reference, paper, group, position }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="result">
      <Link className="result-text" href={href} onClick={() => track("search_result_opened", { group, position })}>
        <Text parts={open && whole ? whole : parts} />
      </Link>
      <footer>
        {reference}
        <span>{paper}</span>
        {close && <i className="close">close match</i>}
        {whole && (
          <button
            type="button"
            className="more"
            aria-expanded={open}
            onClick={() => {
              if (!open) track("search_result_expanded", { group, position });
              setOpen(!open);
            }}
          >
            {open ? "Show less" : "Read more"}
          </button>
        )}
      </footer>
    </div>
  );
}
