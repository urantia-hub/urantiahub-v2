"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AccountRows } from "@/components/AccountRows";
import { Icon } from "@/components/icons";
import { applyTextSize, currentTextSize, DEFAULT_STEP, SCALES, subscribeToTextSize } from "@/lib/text-size";
import { applyTheme, currentTheme, subscribeToTheme, type Theme } from "@/lib/theme";

const serverTheme = (): Theme => "light";
const serverSize = () => DEFAULT_STEP;

// The settings of the reader, behind one icon in the header of a paper: the theme, the text size, and
// the reader's account. Later steps add rows here: translation, and parallels for the paper.
export function ReaderSettings() {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const theme = useSyncExternalStore(subscribeToTheme, currentTheme, serverTheme);
  const size = useSyncExternalStore(subscribeToTextSize, currentTextSize, serverSize);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    const onPress = (event: Event) => {
      const target = event.target as Node;
      if (!wrap.current?.contains(target) && !panel.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPress);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPress);
    };
  }, [open]);

  return (
    <div className="reader-settings" ref={wrap} data-open={open ? "" : undefined}>
      <button
        type="button"
        className="settings-button"
        ref={button}
        aria-label="Reader settings"
        title="Reader settings"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((was) => !was)}
      >
        <Icon name="settings" />
      </button>
      {open &&
        // The panel is a child of the page body. The header has a blur, and a blur makes a fixed child
        // take its place from the header and not from the screen.
        createPortal(
          <>
            <div className="settings-scrim" />
            <div className="settings-panel" role="dialog" aria-label="Reader settings" ref={panel}>
              <h2>Theme</h2>
              <div className="segment">
                {(["light", "dark"] as const).map((name) => (
                  <button type="button" key={name} aria-pressed={theme === name} onClick={() => applyTheme(name)}>
                    {name === "light" ? "Light" : "Dark"}
                  </button>
                ))}
              </div>
              <h2>Text size</h2>
              <div className="sizes">
                <button type="button" aria-label="Smaller text" disabled={size === 0} onClick={() => applyTextSize(size - 1)}>
                  A
                </button>
                <div className="dots" role="status" aria-label={`Text size ${size + 1} of ${SCALES.length}`}>
                  {SCALES.map((scale, i) => (
                    <i key={scale} className={i === size ? "on" : undefined} />
                  ))}
                </div>
                <button type="button" className="big" aria-label="Larger text" disabled={size === SCALES.length - 1} onClick={() => applyTextSize(size + 1)}>
                  A
                </button>
              </div>
              <AccountRows />
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
