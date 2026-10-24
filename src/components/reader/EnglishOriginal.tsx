"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { messages } from "@/i18n/messages";

type State = { kind: "loading" } | { kind: "ready"; text: string } | { kind: "failed" };

// The English text of a Spanish paragraph, shown inside the paragraph after its own text.
export function EnglishOriginal({ reference, onHide }: { reference: string; onHide: () => void }) {
  const t = messages("es");
  // The caller gives each paragraph its own instance (`key`), so the state starts again for each one.
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/english/${encodeURIComponent(reference)}`, { signal: ctrl.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { text: string };
        setState({ kind: "ready", text: body.text });
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setState({ kind: "failed" });
      });
    return () => ctrl.abort();
  }, [reference]);

  // The block goes at the end of the paragraph, after its text, as the marks go into `.marks`.
  const para = document.getElementById(reference);
  if (!para) return null;
  return createPortal(
    <span className="orig" lang="en">
      <span className="orig-head" lang="es">
        <span className="orig-label">{t.origLabel}</span>
        <button type="button" className="orig-hide" onClick={onHide}>
          {t.origHide}
        </button>
      </span>
      {state.kind === "ready" && <span className="orig-text">{state.text}</span>}
      {state.kind === "loading" && <span className="orig-text orig-wait" aria-busy="true" />}
      {state.kind === "failed" && <span className="orig-text" lang="es">{t.origFailed}</span>}
    </span>,
    para,
  );
}
