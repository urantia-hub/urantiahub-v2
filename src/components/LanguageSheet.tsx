"use client";

import { type RefObject, useEffect, useRef, useSyncExternalStore } from "react";
import { track } from "@/analytics";
import { Icon } from "@/components/icons";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { counterpart } from "@/i18n/paths";
import { useLeave } from "@/lib/use-leave";
import { offlineState, removeOffline, serverOfflineState, startOffline, subscribeToOffline } from "@/reader/offline";
import { setReadingLang } from "@/reader/reading-lang";

const NAMES: Record<Lang, string> = { en: "English", es: "Español" };

// The paragraph that the reader is at: the marked one, the one in the address, or the first one in view.
function hereParagraph(): string | null {
  const picked = document.querySelector<HTMLElement>(".para[data-picked]");
  if (picked) return picked.id;
  const hash = decodeURIComponent(window.location.hash.slice(1));
  if (hash) return hash;
  for (const para of document.querySelectorAll<HTMLElement>(".para")) if (para.getBoundingClientRect().top >= 84) return para.id;
  return null;
}

function OfflineSwitch({ of, lang }: { of: Lang; lang: Lang }) {
  const t = messages(lang);
  const offline = useSyncExternalStore(subscribeToOffline, () => offlineState(of), serverOfflineState);
  const on = offline.mode !== "off";
  const line = offline.mode === "on" ? t.offlineKept(offline.total) : offline.mode === "loading" ? t.offlineLoading(offline.have, offline.total) : t.offlineGet(offline.total);
  return (
    <div className="device-row">
      <span id={`offline-${of}`}>
        {NAMES[of]}
        <small role="status">{line}</small>
      </span>
      <button
        type="button"
        role="switch"
        className="switch"
        aria-checked={on}
        aria-labelledby={`offline-${of}`}
        onClick={() => {
          track("offline_set", { on: !on, lang: of });
          void (on ? removeOffline(of) : startOffline(of));
        }}
      />
    </div>
  );
}

// The language sheet: the language to read in, and the papers of each language that this device keeps.
// A choice of the other language opens the same paragraph there, with a full page load.
export function LanguageSheet({
  lang,
  onClose,
  navigate = (href) => window.location.assign(href),
  anchor,
}: {
  lang: Lang;
  onClose: () => void;
  navigate?: (href: string) => void;
  anchor?: RefObject<HTMLElement | null>;
}) {
  const t = messages(lang);
  const panel = useRef<HTMLDivElement>(null);
  const { leaving, leave } = useLeave(onClose);
  const offline = useSyncExternalStore(subscribeToOffline, () => offlineState("en"), serverOfflineState);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      leave();
      anchor?.current?.focus();
    };
    const onPress = (event: Event) => {
      const target = event.target as Node;
      if (!panel.current?.contains(target) && !anchor?.current?.contains(target)) leave();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPress);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPress);
    };
  }, [leave, anchor]);

  const choose = (to: Lang) => {
    setReadingLang(to);
    if (to === lang) return leave();
    track("language_set", { to });
    const here = hereParagraph();
    const { pathname, search } = window.location;
    navigate(counterpart(`${pathname}${search}${here ? `#${here}` : ""}`, to));
  };

  return (
    <>
      <div className="lang-scrim" data-leaving={leaving ? "" : undefined} />
      <div className="lang-sheet" role="dialog" aria-labelledby="lang-title" ref={panel} data-leaving={leaving ? "" : undefined}>
        <h2 id="lang-title">{t.language}</h2>
        <h3>{t.readIn}</h3>
        <div className="lang-pick" role="radiogroup" aria-labelledby="lang-title">
          {(["en", "es"] as const).map((each) => (
            <button type="button" role="radio" key={each} aria-checked={each === lang} onClick={() => choose(each)}>
              <span>
                <b lang={each}>{NAMES[each]}</b>
                <small>
                  {each === "en" ? (
                    <>
                      {t.englishLine} · <Icon name="speaker" /> {t.audio}
                    </>
                  ) : (
                    t.spanishLine
                  )}
                </small>
              </span>
              <i>{each === lang && <Icon name="check" />}</i>
            </button>
          ))}
        </div>
        <p className="lang-fine">{t.sameParagraph}</p>
        {offline.can && (
          <>
            <h3>{t.offline}</h3>
            <OfflineSwitch of="en" lang={lang} />
            <OfflineSwitch of="es" lang={lang} />
          </>
        )}
        <p className="lang-about">
          <b>{t.aboutTitle}</b> {t.aboutBody}
        </p>
      </div>
    </>
  );
}
