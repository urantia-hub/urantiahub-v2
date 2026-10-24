"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icons";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { LanguageSheet } from "./LanguageSheet";

// "EN" or "ES" with a globe, in the header of a paper and of the contents. It opens the language sheet.
export function LanguagePill({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const t = messages(lang);
  return (
    <>
      <button
        type="button"
        className="lang-pill"
        ref={button}
        aria-label={t.languageOf}
        title={t.language}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((was) => !was)}
      >
        <Icon name="globe" />
        {lang.toUpperCase()}
      </button>
      {/* The header has a blur, so the sheet is a child of the page body. */}
      {open && createPortal(<LanguageSheet lang={lang} onClose={() => setOpen(false)} anchor={button} />, document.body)}
    </>
  );
}
