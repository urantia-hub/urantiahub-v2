"use client";

import { useEffect } from "react";
import { units } from "@/image/compose";
import { parseUnitCode, sharedFromAddress, sharedPassageFromAddress, unitRanges } from "@/reader/share-link";
import { rangeOf } from "@/reader/text-range";

// A reader who arrives by a link to some sentences of a paragraph: the page stops with the first of them
// near the top of the screen, and they have a soft mark. The mark goes at the first press, and when the
// paragraph leaves the screen. The paragraph is server HTML, so the mark is a highlight and no tag.
// On a world text page (`work`) the link of a pair names a passage, and a range runs across `n` passages.
export function SharedMark({ work = false }: { work?: boolean }) {
  useEffect(() => {
    const found = work ? passageMarks() : paragraphMarks();
    if (!found) return;
    const { para, marks } = found;

    const frame = window.requestAnimationFrame(() => {
      const top = marks[0].getBoundingClientRect().top + window.scrollY - Math.max(96, window.innerHeight * 0.2);
      window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
    });
    const can = typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight === "function";
    if (can) {
      // The rule is added here: the CSS tool of the build does not know `::highlight` yet.
      if (!document.getElementById("shared-mark")) {
        const style = document.createElement("style");
        style.id = "shared-mark";
        style.textContent = '::highlight(shared){background-color:var(--mark)}:root[data-theme="dark"] ::highlight(shared){background-color:#4a4226}';
        document.head.append(style);
      }
      CSS.highlights.set("shared", new Highlight(...marks));
    }
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
  }, [work]);
  return null;
}

// The chosen units of one paragraph of a paper.
function paragraphMarks(): { para: HTMLElement; marks: Range[] } | null {
  const shared = sharedFromAddress(window.location.search, window.location.hash);
  const para = shared ? document.getElementById(shared.ref) : null;
  const text = para?.querySelector(":scope > .text");
  if (!shared || !para || !text) return null;
  const ranges = unitRanges(text.textContent ?? "");
  const chosen = parseUnitCode(shared.code, units(text.textContent ?? ""));
  if (!chosen || ranges.length === 0) return null;
  return { para, marks: [...chosen].sort((a, b) => a - b).map((i) => rangeOf(text, ranges[i])) };
}

// The chosen units of a passage of a world text, or of the passages of a range, as one text joined with a space.
function passageMarks(): { para: HTMLElement; marks: Range[] } | null {
  const shared = sharedPassageFromAddress(window.location.search, window.location.hash);
  const para = shared ? document.getElementById(shared.id) : null;
  if (!shared || !para?.matches(".paper.work p.para")) return null;
  const paras = [para];
  for (let next = para.nextElementSibling; next && paras.length < shared.count; next = next.nextElementSibling) if (next.matches("p.para")) paras.push(next as HTMLElement);
  const texts = paras.map((p) => p.querySelector(":scope > .text")).filter((t): t is Element => t !== null);
  if (texts.length !== shared.count) return null;
  // Where each passage starts in the joined text.
  let at = 0;
  const parts = texts.map((el) => {
    const part = { el, from: at, to: at + (el.textContent ?? "").length };
    at = part.to + 1;
    return part;
  });
  const joined = texts.map((el) => el.textContent ?? "").join(" ");
  const ranges = unitRanges(joined);
  const chosen = parseUnitCode(shared.code, units(joined));
  if (!chosen || ranges.length === 0) return null;
  const marks = [...chosen]
    .sort((a, b) => a - b)
    .flatMap((i) => {
      const [a, b] = ranges[i];
      // A unit that runs across two passages is one range in each.
      return parts.filter((p) => a < p.to && b > p.from).map((p) => rangeOf(p.el, [Math.max(a, p.from) - p.from, Math.min(b, p.to) - p.from]));
    });
  return marks.length > 0 ? { para, marks } : null;
}
