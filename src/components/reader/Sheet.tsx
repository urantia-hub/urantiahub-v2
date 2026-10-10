"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { useMoreBelow } from "@/lib/use-more-below";
import { createPortal } from "react-dom";

type Props = { label: string; onClose: () => void; className?: string; children: ReactNode };

// A small panel above the controls of a paper: a sheet on a phone, a card on a wide screen.
// Escape and a press outside close it. The caller gives the focus back to its own button.
export function Sheet({ label, onClose, className, children }: Props) {
  const scroll = useMoreBelow<HTMLDivElement>();
  const box = scroll.ref;
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    // A field inside can take the focus first. Then it keeps it.
    if (!box.current?.contains(document.activeElement)) box.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // The sheet takes Escape. The controls below it keep the marked paragraph.
      event.preventDefault();
      close.current();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [box]);

  return createPortal(
    <>
      <div className="panel-scrim" onClick={onClose} />
      <div className={`panel${className ? ` ${className}` : ""}`} role="dialog" aria-label={label} tabIndex={-1} {...scroll}>
        {children}
      </div>
    </>,
    document.body,
  );
}
