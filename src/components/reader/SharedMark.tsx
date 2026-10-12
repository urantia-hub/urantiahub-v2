"use client";

import { useEffect } from "react";
import { parsePick, sentenceRanges, sharedFromAddress } from "@/reader/share-link";

// The part of an element between two places in its text, across the tags inside it.
function rangeOf(el: Element, [start, end]: [number, number]): Range {
  const range = document.createRange();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let at = 0;
  let started = false;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const length = node.textContent?.length ?? 0;
    if (!started && start < at + length) {
      range.setStart(node, start - at);
      started = true;
    }
    if (started && end <= at + length) {
      range.setEnd(node, end - at);
      break;
    }
    at += length;
  }
  return range;
}

// A reader who arrives by a link to some sentences of a paragraph: the page stops with the first of them
// near the top of the screen, and they have a soft mark. The mark goes at the first press, and when the
// paragraph leaves the screen. The paragraph is server HTML, so the mark is a highlight and no tag.
export function SharedMark() {
  useEffect(() => {
    const shared = sharedFromAddress(window.location.search, window.location.hash);
    const para = shared ? document.getElementById(shared.ref) : null;
    const text = para?.querySelector(":scope > .text");
    if (!shared || !para || !text) return;
    const ranges = sentenceRanges(text.textContent ?? "");
    const chosen = parsePick(shared.code, ranges.length);
    if (!chosen) return;
    const marks = [...chosen].sort((a, b) => a - b).map((i) => rangeOf(text, ranges[i]));

    const frame = window.requestAnimationFrame(() => {
      const top = marks[0].getBoundingClientRect().top + window.scrollY - Math.max(96, window.innerHeight * 0.2);
      window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
    });
    const can = typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight === "function";
    if (can) CSS.highlights.set("shared", new Highlight(...marks));
    para.setAttribute("data-shared", "");

    const clear = () => {
      if (can) CSS.highlights.delete("shared");
      para.removeAttribute("data-shared");
      document.removeEventListener("click", clear);
      watch?.disconnect();
    };
    let seen = false;
    const watch =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) seen = true;
            else if (seen) clear();
          })
        : null;
    watch?.observe(para);
    document.addEventListener("click", clear);
    return () => {
      window.cancelAnimationFrame(frame);
      clear();
    };
  }, []);
  return null;
}
