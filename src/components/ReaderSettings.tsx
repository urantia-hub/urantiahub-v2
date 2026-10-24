"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { accountState, serverAccountState, subscribeToAccount } from "@/account/client";
import { AccountRows } from "@/components/AccountRows";
import { ContinueRow } from "@/components/ContinueRow";
import { Icon } from "@/components/icons";
import { OfflineRow } from "@/components/OfflineRow";
import { type Lang, spanishOn } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { applyTextSize, currentTextSize, DEFAULT_STEP, SCALES, subscribeToTextSize } from "@/lib/text-size";
import { applyTheme, currentTheme, subscribeToTheme, type Theme } from "@/lib/theme";

const serverTheme = (): Theme => "light";
const serverSize = () => DEFAULT_STEP;

// The settings of the reader and the reader's account, behind one icon in the header of a paper and
// of the contents page: the account, the reader's pages, and what belongs to this device (the theme, the
// text size, and "Read offline").
export function ReaderSettings({ lang = "en" }: { lang?: Lang }) {
  const t = messages(lang);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const theme = useSyncExternalStore(subscribeToTheme, currentTheme, serverTheme);
  const size = useSyncExternalStore(subscribeToTextSize, currentTextSize, serverSize);
  const account = useSyncExternalStore(subscribeToAccount, accountState, serverAccountState);
  const initial = account.status === "in" ? (account.user?.name || account.user?.email || "").trim().charAt(0).toUpperCase() : "";

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
        aria-label={t.settingsTitle}
        title={t.settingsTitle}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((was) => !was)}
      >
        {/* A person, and the reader's initial after a sign-in. While the site has no sign-in, the sliders. */}
        {initial ? <span className="face">{initial}</span> : <Icon name={account.status === "off" ? "settings" : "person"} />}
      </button>
      {open &&
        // The panel is a child of the page body. The header has a blur, and a blur makes a fixed child
        // take its place from the header and not from the screen.
        createPortal(
          <>
            <div className="settings-scrim" />
            <div
              className="settings-panel"
              role="dialog"
              aria-label={t.settingsTitle}
              ref={panel}
              // A link in the panel goes to another page. The panel does not stay open over it.
              // The sign-in is not a page of this site: the way there takes a moment, and the row
              // says "Opening the sign-in…" until then, so the panel stays (Kelson, 2026-10-11).
              onClick={(event) => {
                const link = (event.target as HTMLElement).closest("a");
                if (link && !link.getAttribute("href")?.startsWith("/api/auth/start")) setOpen(false);
              }}
            >
              {/* Three groups: who reads, the reader's pages, and this device. How the page looks and what
                  the device keeps belong to the device, with or without an account. */}
              <AccountRows part="who" lang={lang} />
              <div className="settings-group">
                <ContinueRow lang={lang} />
                <AccountRows part="pages" lang={lang} />
              </div>
              <div className="settings-group device">
                <h2>{t.thisDevice}</h2>
                <div className="device-row">
                  <Icon name="sun" />
                  <span>{t.theme}</span>
                  <div className="segment">
                    {(["light", "dark"] as const).map((name) => (
                      <button type="button" key={name} aria-pressed={theme === name} onClick={() => applyTheme(name)}>
                        {name === "light" ? t.light : t.dark}
                      </button>
                    ))}
                  </div>
                </div>
                {/* A page with no text of a paper hides this row. See chrome.css. */}
                <div className="device-row size-row">
                  <Icon name="textSize" />
                  <span>{t.textSize}</span>
                  <div className="sizes">
                    <button type="button" aria-label={t.smallerText} disabled={size === 0} onClick={() => applyTextSize(size - 1)}>
                      A
                    </button>
                    <div className="dots" role="status" aria-label={t.textSizeOf(size + 1, SCALES.length)}>
                      {SCALES.map((scale, i) => (
                        <i key={scale} className={i === size ? "on" : undefined} />
                      ))}
                    </div>
                    <button type="button" className="big" aria-label={t.largerText} disabled={size === SCALES.length - 1} onClick={() => applyTextSize(size + 1)}>
                      A
                    </button>
                  </div>
                </div>
                {/* With Spanish on, "Read offline" is in the language sheet, one switch for each language. */}
                {!spanishOn() && <OfflineRow />}
              </div>
              <AccountRows part="out" lang={lang} />
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
