"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { track } from "@/analytics";
import { Navigator } from "./Navigator";
import { nextHidden, sectionLabel, type NavPaper, type NavSection } from "./nav-state";

type Props = {
  paper: { id: string; title: string };
  sections: NavSection[];
  previous: NavPaper | null;
  next: NavPaper | null;
};

// One bar at the thumb: the section the reader is in, the position in the paper, and the way to the navigator.
export function ReadingNav({ paper, sections, previous, next }: Props) {
  const [current, setCurrent] = useState("0");
  const [progress, setProgress] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    track("paper_opened", { paper_id: paper.id });
  }, [paper.id]);

  useEffect(() => {
    const heads = [...document.querySelectorAll<HTMLElement>(".paper .sec")];
    let last = window.scrollY;
    let frame = 0;

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      let section = "0";
      for (const head of heads) {
        if (head.getBoundingClientRect().top <= 120) section = head.id.split(":")[1];
      }
      setCurrent(section);
      setProgress(max > 0 ? Math.min(1, Math.max(0, y / max)) : 0);
      // React can run the updater later, so it must not read `last` after the line below changes it.
      const previous = last;
      last = y;
      setHidden((was) => nextHidden(previous, y, was));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, [paper.id]);

  const section = sections.find((s) => s.id === current);
  const label = !section || section.id === "0" ? paper.title : sectionLabel(section);

  return (
    <>
      <div
        className={`reading-bar${hidden && !open ? " away" : ""}`}
        data-testid="reading-bar"
        onFocus={() => setHidden(false)}
      >
        {previous ? (
          <Link className="step" href={previous.href} aria-label={`Previous: ${previous.title}`}>
            ‹
          </Link>
        ) : (
          <span className="step" />
        )}
        <button
          type="button"
          className="where"
          aria-haspopup="dialog"
          aria-label={`${label}. Open the navigator`}
          onClick={() => {
            track("navigator_opened", { paper_id: paper.id });
            setOpen(true);
          }}
        >
          <small>{paper.id === "0" ? "The Urantia Papers" : `Paper ${paper.id}`}</small>
          <span data-testid="reading-bar-label">{label}</span>
        </button>
        {next ? (
          <Link className="step" href={next.href} aria-label={`Next: ${next.title}`}>
            ›
          </Link>
        ) : (
          <span className="step" />
        )}
        <div className="fill" style={{ width: `${progress * 100}%` }} />
      </div>
      <Navigator
        open={open}
        onClose={() => setOpen(false)}
        paper={paper}
        sections={sections}
        current={current}
        previous={previous}
        next={next}
      />
    </>
  );
}
