"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLeave } from "@/lib/use-leave";
import { useMoreBelow } from "@/lib/use-more-below";

// With a `foot`, the content scrolls above it and the foot keeps its place.
type Props = { label: string; onClose: () => void; className?: string; foot?: ReactNode; children: ReactNode };

// A small panel above the controls of a paper: a sheet on a phone, a card on a wide screen.
// Escape and a press outside close it. The caller gives the focus back to its own button.
export function Sheet({ label, onClose, className, foot, children }: Props) {
  const { ref: scrolled, ...scroll } = useMoreBelow<HTMLDivElement>();
  const box = useRef<HTMLDivElement>(null);
  const { leaving, leave } = useLeave(onClose);

  useEffect(() => {
    // A field inside can take the focus first. Then it keeps it.
    if (!box.current?.contains(document.activeElement)) box.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // The sheet takes Escape. The controls below it keep the marked paragraph.
      event.preventDefault();
      leave();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [leave]);

  const names = `panel${foot ? " has-foot" : ""}${className ? ` ${className}` : ""}`;
  const state = { role: "dialog", "aria-label": label, tabIndex: -1, "data-leaving": leaving ? "" : undefined } as const;
  return createPortal(
    <>
      <div className="panel-scrim" data-leaving={leaving ? "" : undefined} onClick={leave} />
      {foot ? (
        <div className={names} {...state} ref={box}>
          <div className="panel-body" ref={scrolled} {...scroll}>
            {children}
          </div>
          <div className="panel-foot">{foot}</div>
        </div>
      ) : (
        <div
          className={names}
          {...state}
          {...scroll}
          ref={(el) => {
            box.current = el;
            scrolled.current = el;
          }}
        >
          {children}
        </div>
      )}
    </>,
    document.body,
  );
}
